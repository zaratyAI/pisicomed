import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, evaluation_id, changed_by, notes } = body;

    if (!action || !evaluation_id) {
      return json({ success: false, error: "action e evaluation_id são obrigatórios" }, 400);
    }

    // Extract JWT and verify user + permissions
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userChangedBy = changed_by || "sistema";

    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        // Get user profile name for audit
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
        userChangedBy = profile?.full_name || profile?.email || user.email || userChangedBy;

        // Map action to permission
        const actionPermissionMap: Record<string, string> = {
          proposal_sent: "send_proposal",
          proposal_accepted: "accept_proposal",
          schedule: "schedule",
          reschedule: "reschedule",
          realize: "realize",
          complete: "complete",
          cancel: "cancel",
        };

        const requiredPermission = actionPermissionMap[action];
        if (requiredPermission) {
          const { data: hasPermission } = await supabase.rpc("check_permission", {
            _user_id: user.id,
            _action: requiredPermission,
          });
          if (!hasPermission) {
            return json({ success: false, error: "Sem permissão para executar esta ação" }, 403);
          }
        }
      }
    }

    let result: Record<string, unknown>;

    switch (action) {
      case "proposal_sent": {
        const { proposal_link } = body;
        if (!proposal_link?.trim()) {
          return json({ success: false, error: "Link da proposta é obrigatório" }, 400);
        }
        try { new URL(proposal_link); } catch {
          return json({ success: false, error: "Link da proposta deve ser uma URL válida" }, 400);
        }

        // Check quote exists
        const { data: quote } = await supabase
          .from("quote_requests")
          .select("id")
          .eq("evaluation_id", evaluation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!quote) {
          return json({ success: false, error: "Nenhuma solicitação de orçamento encontrada" }, 400);
        }

        // Update quote
        await supabase.from("quote_requests").update({
          proposal_link, status: "proposal_sent", proposal_status: "sent",
        }).eq("evaluation_id", evaluation_id);

        // Transition stage via DB function (skip if already at target status)
        const { data: currentStage } = await supabase
          .from("journey_stages")
          .select("status")
          .eq("evaluation_id", evaluation_id)
          .eq("stage_code", 2)
          .maybeSingle();

        if (currentStage?.status !== "proposta_enviada" && currentStage?.status !== "concluida") {
          const stageRes = await supabase.rpc("transition_stage_safe", {
            p_evaluation_id: evaluation_id, p_stage_code: 2,
            p_new_status: "proposta_enviada", p_changed_by: userChangedBy,
            p_notes: notes || `Link da proposta: ${proposal_link}`, p_origin: "manual",
          });
          if (!stageRes.data?.success) {
            return json({ success: false, error: stageRes.data?.error || "Erro na transição de etapa" }, 400);
          }
        }

        // Pipeline transition — may need intermediate step from avaliacao_inicial
        const { data: evalData } = await supabase
          .from("evaluations")
          .select("pipeline_status")
          .eq("id", evaluation_id)
          .single();

        if (evalData?.pipeline_status === "avaliacao_inicial") {
          // First transition to proposta_solicitada
          const midRes = await supabase.rpc("transition_pipeline_safe", {
            p_evaluation_id: evaluation_id, p_new_status: "proposta_solicitada",
            p_changed_by: userChangedBy, p_origin: "automatico",
          });
          if (!midRes.data?.success) {
            return json({ success: false, error: midRes.data?.error || "Erro na transição intermediária de pipeline" }, 400);
          }
        }

        const pipeRes = await supabase.rpc("transition_pipeline_safe", {
          p_evaluation_id: evaluation_id, p_new_status: "proposta_enviada",
          p_changed_by: userChangedBy, p_origin: "automatico",
        });
        if (!pipeRes.data?.success) {
          return json({ success: false, error: pipeRes.data?.error || "Erro na transição de pipeline" }, 400);
        }

        result = { success: true, action: "proposal_sent" };
        break;
      }

      case "proposal_accepted": {
        // Check quote
        const { data: quote } = await supabase
          .from("quote_requests")
          .select("id, proposal_link, proposal_status")
          .eq("evaluation_id", evaluation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!quote) return json({ success: false, error: "Nenhuma solicitação de orçamento encontrada" }, 400);
        if (!quote.proposal_link) return json({ success: false, error: "Proposta precisa ser enviada primeiro" }, 400);
        if (quote.proposal_status === "approved") return json({ success: false, error: "Proposta já foi aceita" }, 400);

        await supabase.from("quote_requests").update({
          status: "proposal_accepted", proposal_status: "approved",
        }).eq("evaluation_id", evaluation_id);

        // Two-step stage transition: proposta_enviada → proposta_aceita → concluida
        const { data: currentStage } = await supabase
          .from("journey_stages")
          .select("status")
          .eq("evaluation_id", evaluation_id)
          .eq("stage_code", 2)
          .maybeSingle();

        const stageStatus = currentStage?.status;

        if (stageStatus === "proposta_enviada") {
          const midStage = await supabase.rpc("transition_stage_safe", {
            p_evaluation_id: evaluation_id, p_stage_code: 2,
            p_new_status: "proposta_aceita", p_changed_by: userChangedBy,
            p_notes: notes || "Proposta aceita pelo cliente", p_origin: "manual",
          });
          if (!midStage.data?.success) return json({ success: false, error: midStage.data?.error }, 400);
        }

        if (stageStatus !== "concluida") {
          const stageRes = await supabase.rpc("transition_stage_safe", {
            p_evaluation_id: evaluation_id, p_stage_code: 2,
            p_new_status: "concluida", p_changed_by: userChangedBy,
            p_notes: notes || "Etapa de proposta concluída", p_origin: "manual",
          });
          if (!stageRes.data?.success) return json({ success: false, error: stageRes.data?.error }, 400);
        }

        const pipeRes = await supabase.rpc("transition_pipeline_safe", {
          p_evaluation_id: evaluation_id, p_new_status: "proposta_aceita",
          p_changed_by: userChangedBy, p_origin: "automatico",
        });
        if (!pipeRes.data?.success) return json({ success: false, error: pipeRes.data?.error }, 400);

        result = { success: true, action: "proposal_accepted" };
        break;
      }

      case "proposal_rejected": {
        const { data: quote } = await supabase
          .from("quote_requests")
          .select("id, proposal_link, proposal_status")
          .eq("evaluation_id", evaluation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!quote) return json({ success: false, error: "Nenhuma solicitação de orçamento encontrada" }, 400);
        if (!quote.proposal_link) return json({ success: false, error: "Proposta precisa ser enviada primeiro" }, 400);

        await supabase.from("quote_requests").update({
          status: "proposal_rejected", proposal_status: "rejected",
        }).eq("evaluation_id", evaluation_id);

        // Transition pipeline to nao_convertido
        const pipeRes = await supabase.rpc("transition_pipeline_safe", {
          p_evaluation_id: evaluation_id, p_new_status: "nao_convertido",
          p_changed_by: userChangedBy, p_notes: notes || "Proposta recusada pelo cliente",
          p_origin: "manual",
        });
        if (!pipeRes.data?.success) return json({ success: false, error: pipeRes.data?.error }, 400);

        result = { success: true, action: "proposal_rejected" };
        break;
      }

      case "proposal_adjustment": {
        const { data: quote } = await supabase
          .from("quote_requests")
          .select("id, proposal_link, proposal_status")
          .eq("evaluation_id", evaluation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!quote) return json({ success: false, error: "Nenhuma solicitação de orçamento encontrada" }, 400);
        if (!quote.proposal_link) return json({ success: false, error: "Proposta precisa ser enviada primeiro" }, 400);

        await supabase.from("quote_requests").update({
          status: "adjustment_requested", proposal_status: "adjustment_requested",
        }).eq("evaluation_id", evaluation_id);

        // Transition stage back to aguardando_proposta so admin can resend
        const stageRes = await supabase.rpc("transition_stage_safe", {
          p_evaluation_id: evaluation_id, p_stage_code: 2,
          p_new_status: "aguardando_proposta", p_changed_by: userChangedBy,
          p_notes: notes || "Ajuste solicitado na proposta", p_origin: "manual",
        });
        if (!stageRes.data?.success) return json({ success: false, error: stageRes.data?.error }, 400);

        // Transition pipeline back to proposta_solicitada
        const pipeRes = await supabase.rpc("transition_pipeline_safe", {
          p_evaluation_id: evaluation_id, p_new_status: "proposta_solicitada",
          p_changed_by: userChangedBy, p_notes: notes || "Ajuste solicitado na proposta",
          p_origin: "manual",
        });
        if (!pipeRes.data?.success) return json({ success: false, error: pipeRes.data?.error }, 400);

        result = { success: true, action: "proposal_adjustment" };
        break;
      }

      case "proposal_reopen": {
        const { data: quote } = await supabase
          .from("quote_requests")
          .select("id, proposal_link, proposal_status")
          .eq("evaluation_id", evaluation_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!quote) return json({ success: false, error: "Nenhuma solicitação de orçamento encontrada" }, 400);

        // Reset quote to sent status
        await supabase.from("quote_requests").update({
          status: "proposal_sent", proposal_status: "sent",
        }).eq("evaluation_id", evaluation_id);

        // Reset stage 2 back to proposta_enviada if not already
        const { data: currentStage } = await supabase
          .from("journey_stages")
          .select("status")
          .eq("evaluation_id", evaluation_id)
          .eq("stage_code", 2)
          .maybeSingle();

        if (currentStage?.status !== "proposta_enviada") {
          // Direct update since we're reopening from a terminal state
          await supabase.from("journey_stages").update({
            status: "proposta_enviada", updated_at: new Date().toISOString(),
          }).eq("evaluation_id", evaluation_id).eq("stage_code", 2);
        }

        // Transition pipeline: nao_convertido → proposta_enviada
        // Need to go through proposta_solicitada first
        const { data: evalData } = await supabase
          .from("evaluations")
          .select("pipeline_status")
          .eq("id", evaluation_id)
          .single();

        if (evalData?.pipeline_status === "nao_convertido") {
          // Direct update since nao_convertido is terminal in the transition map
          await supabase.from("evaluations").update({
            pipeline_status: "proposta_enviada",
            version: (await supabase.from("evaluations").select("version").eq("id", evaluation_id).single()).data?.version + 1 || 1,
            updated_at: new Date().toISOString(),
          }).eq("id", evaluation_id);

          // Audit log
          await supabase.from("stage_audit_logs").insert({
            evaluation_id, from_status: "nao_convertido", to_status: "proposta_enviada",
            action: "pipeline:nao_convertido→proposta_enviada",
            changed_by: userChangedBy, notes: notes || "Proposta reaberta para renegociação",
            origin: "manual",
          });
        }

        result = { success: true, action: "proposal_reopen" };
        break;
      }

      case "schedule": {
        const { stage_code, scheduled_date, appointment_type, location, professional_id } = body;
        if (!stage_code || !scheduled_date) {
          return json({ success: false, error: "stage_code e scheduled_date são obrigatórios" }, 400);
        }
        const dateObj = new Date(scheduled_date + "T00:00:00");
        if (isNaN(dateObj.getTime())) return json({ success: false, error: "Data inválida" }, 400);

        const apptRes = await supabase.rpc("create_appointment_safe", {
          p_evaluation_id: evaluation_id, p_stage_code: stage_code,
          p_scheduled_date: scheduled_date, p_changed_by: userChangedBy,
          p_notes: notes || `Agendado para ${scheduled_date}`,
          p_appointment_type: appointment_type || "presencial",
          p_location: location || null, p_professional_id: professional_id || null,
        });

        if (!apptRes.data?.success) {
          return json({ success: false, error: apptRes.data?.error || "Erro ao criar agendamento" }, 400);
        }

        if (stage_code === 3) {
          await supabase.rpc("transition_pipeline_safe", {
            p_evaluation_id: evaluation_id, p_new_status: "agendado",
            p_changed_by: userChangedBy, p_origin: "automatico",
          });
        }

        result = { success: true, action: "schedule", appointment_id: apptRes.data.appointment_id, idempotent: apptRes.data.idempotent };
        break;
      }

      case "reschedule": {
        const { stage_code: sc, scheduled_date: nd } = body;
        if (!sc || !nd) return json({ success: false, error: "stage_code e scheduled_date são obrigatórios" }, 400);

        await supabase.from("appointments").update({ scheduled_date: nd })
          .eq("evaluation_id", evaluation_id).eq("stage_code", sc).eq("status", "agendado");

        await supabase.from("journey_stages").update({ scheduled_date: nd })
          .eq("evaluation_id", evaluation_id).eq("stage_code", sc);

        await supabase.from("stage_audit_logs").insert({
          evaluation_id, stage_code: sc, from_status: "agendado", to_status: "agendado",
          action: `reagendamento:stage${sc}`, changed_by: userChangedBy,
          notes: notes || `Reagendado para ${nd}`, origin: "manual",
        });

        result = { success: true, action: "reschedule" };
        break;
      }

      case "realize": {
        const { stage_code: rsc } = body;
        if (!rsc) return json({ success: false, error: "stage_code é obrigatório" }, 400);

        const stageRes = await supabase.rpc("transition_stage_safe", {
          p_evaluation_id: evaluation_id, p_stage_code: rsc,
          p_new_status: "realizado", p_changed_by: userChangedBy,
          p_notes: notes || "Marcado como realizado", p_origin: "manual",
        });
        if (!stageRes.data?.success) return json({ success: false, error: stageRes.data?.error }, 400);

        await supabase.from("appointments").update({ status: "realizado" })
          .eq("evaluation_id", evaluation_id).eq("stage_code", rsc).eq("status", "agendado");

        if (rsc === 3 || rsc === 4) {
          await supabase.rpc("transition_pipeline_safe", {
            p_evaluation_id: evaluation_id, p_new_status: "em_realizacao",
            p_changed_by: userChangedBy, p_origin: "automatico",
          });
        }

        result = { success: true, action: "realize" };
        break;
      }

      case "complete": {
        const { stage_code: csc } = body;
        if (!csc) return json({ success: false, error: "stage_code é obrigatório" }, 400);

        // Check previous stages are complete
        if (csc > 1) {
          const { data: prevStages } = await supabase
            .from("journey_stages")
            .select("stage_code, status")
            .eq("evaluation_id", evaluation_id)
            .lt("stage_code", csc);

          const incomplete = (prevStages || []).filter(
            (s: any) => s.status !== "concluida" && s.status !== "cancelado"
          );
          if (incomplete.length > 0) {
            const codes = incomplete.map((s: any) => s.stage_code).join(", ");
            return json({ success: false, error: `Etapas anteriores não concluídas: ${codes}` }, 400);
          }
        }

        const stageRes = await supabase.rpc("transition_stage_safe", {
          p_evaluation_id: evaluation_id, p_stage_code: csc,
          p_new_status: "concluida", p_changed_by: userChangedBy,
          p_notes: notes || `Etapa ${csc} concluída`, p_origin: "manual",
        });
        if (!stageRes.data?.success) return json({ success: false, error: stageRes.data?.error }, 400);

        // Auto pipeline transitions
        if (csc === 5) {
          await supabase.rpc("transition_pipeline_safe", {
            p_evaluation_id: evaluation_id, p_new_status: "em_analise",
            p_changed_by: userChangedBy, p_origin: "automatico",
          });
        } else if (csc === 7) {
          // Auto-complete stage 8
          await supabase.rpc("transition_stage_safe", {
            p_evaluation_id: evaluation_id, p_stage_code: 8,
            p_new_status: "concluida", p_changed_by: "sistema",
            p_notes: "Finalizado automaticamente após atualização do PGR", p_origin: "automatico",
          });
          await supabase.rpc("transition_pipeline_safe", {
            p_evaluation_id: evaluation_id, p_new_status: "finalizado",
            p_changed_by: userChangedBy, p_origin: "automatico",
          });
        }

        result = { success: true, action: "complete" };
        break;
      }

      case "cancel": {
        const { reason } = body;
        if (!reason?.trim()) return json({ success: false, error: "Motivo do cancelamento é obrigatório" }, 400);

        const pipeRes = await supabase.rpc("transition_pipeline_safe", {
          p_evaluation_id: evaluation_id, p_new_status: "cancelado",
          p_changed_by: userChangedBy, p_notes: reason, p_origin: "manual",
        });
        if (!pipeRes.data?.success) return json({ success: false, error: pipeRes.data?.error }, 400);

        // Cancel all pending stages
        const { data: stages } = await supabase
          .from("journey_stages")
          .select("stage_code, status")
          .eq("evaluation_id", evaluation_id);

        for (const stage of stages || []) {
          if ((stage as any).status !== "concluida" && (stage as any).status !== "cancelado") {
            await supabase.rpc("transition_stage_safe", {
              p_evaluation_id: evaluation_id, p_stage_code: (stage as any).stage_code,
              p_new_status: "cancelado", p_changed_by: userChangedBy,
              p_notes: `Cancelado em lote: ${reason}`, p_origin: "automatico",
            });
          }
        }

        result = { success: true, action: "cancel" };
        break;
      }

      default:
        return json({ success: false, error: `Ação desconhecida: ${action}` }, 400);
    }

    return json(result, 200);
  } catch (err) {
    console.error("Pipeline action error:", err);
    return json({ success: false, error: err.message || "Erro interno" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
