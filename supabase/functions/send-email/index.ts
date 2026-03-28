import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SMTP config from environment variables
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";
const SMTP_FROM = Deno.env.get("SMTP_FROM") || "psicossociais@medwork-to.com.br";

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
    const { action, evaluation_id, recipient_email, cc_emails, subject, custom_message } = body;

    if (!evaluation_id) {
      return json({ success: false, error: "evaluation_id é obrigatório" }, 400);
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    let changedBy = "sistema";
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
        changedBy = profile?.full_name || profile?.email || user.email || "admin";
      }
    }

    // Get evaluation data
    const { data: evaluation } = await supabase
      .from("evaluations")
      .select("*, companies(*), evaluators(*)")
      .eq("id", evaluation_id)
      .single();

    if (!evaluation) return json({ success: false, error: "Avaliação não encontrada" }, 404);

    const company = (evaluation as any).companies;
    const evaluator = (evaluation as any).evaluators;

    // Get action plans
    const { data: actionPlans } = await supabase
      .from("action_plans")
      .select("*")
      .eq("evaluation_id", evaluation_id)
      .order("priority");

    const plans = actionPlans || [];

    // Build email body based on action type
    let emailSubject = subject || "";
    let emailBody = "";
    const targetEmail = recipient_email || evaluator?.email || "";

    if (!targetEmail) {
      return json({ success: false, error: "Email do destinatário não informado" }, 400);
    }

    switch (action) {
      case "send_action_plan": {
        // Client-side: auto-send after generating action plan
        emailSubject = emailSubject || `Plano de Ação — ${company?.legal_name || "Avaliação de Riscos Psicossociais"}`;
        emailBody = buildActionPlanEmail(company, evaluator, plans, custom_message);
        break;
      }

      case "send_admin_report": {
        // Admin-side: send to key contacts for legal protection
        emailSubject = emailSubject || `Relatório de Diagnóstico Psicossocial — ${company?.legal_name || ""}`;
        emailBody = buildAdminReportEmail(company, evaluator, plans, evaluation, custom_message);
        break;
      }

      default:
        return json({ success: false, error: `Ação desconhecida: ${action}` }, 400);
    }

    // Send email via SMTP
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      // Log the attempt even if SMTP isn't configured yet
      await supabase.from("email_logs").insert({
        evaluation_id,
        recipient_email: targetEmail,
        cc_email: cc_emails || null,
        subject: emailSubject,
        status: "smtp_not_configured",
        error_message: "SMTP credentials not configured",
      });
      return json({
        success: false,
        error: "Servidor de email não configurado. Configure as variáveis SMTP_HOST, SMTP_USER e SMTP_PASS.",
        preview: { subject: emailSubject, to: targetEmail, body_length: emailBody.length }
      }, 400);
    }

    // Use Deno's built-in SMTP via denopkg
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: SMTP_PORT === 465,
        auth: {
          username: SMTP_USER,
          password: SMTP_PASS,
        },
      },
    });

    const sendConfig: any = {
      from: `Med Work <${SMTP_FROM}>`,
      to: targetEmail,
      subject: emailSubject,
      content: "Veja este email em um cliente que suporte HTML.",
      html: emailBody,
    };

    if (cc_emails) {
      sendConfig.cc = cc_emails;
    }

    await client.send(sendConfig);
    await client.close();

    // Log success
    await supabase.from("email_logs").insert({
      evaluation_id,
      recipient_email: targetEmail,
      cc_email: cc_emails || null,
      subject: emailSubject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return json({ success: true, sent_to: targetEmail, subject: emailSubject });

  } catch (err) {
    console.error("Send email error:", err);
    return json({ success: false, error: err.message || "Erro ao enviar email" }, 500);
  }
});

function buildActionPlanEmail(
  company: any,
  evaluator: any,
  plans: any[],
  customMessage?: string
): string {
  const highCount = plans.filter(p => p.priority === "Alta").length;
  const medCount = plans.filter(p => p.priority === "Média").length;
  const lowCount = plans.filter(p => p.priority === "Baixa").length;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #1A8B9D, #2E9E6B); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
  .content { padding: 24px; background: #f9fafb; }
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 16px; }
  .stat { flex: 1; text-align: center; padding: 12px; background: #f3f4f6; border-radius: 8px; }
  .stat .num { font-size: 24px; font-weight: bold; }
  .stat .label { font-size: 11px; color: #6b7280; }
  .alta { color: #dc2626; } .media { color: #d97706; } .baixa { color: #2563eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1A8B9D; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #f9fafb; }
  .priority-alta { background: #fef2f2; color: #dc2626; font-weight: bold; }
  .priority-media { background: #fffbeb; color: #d97706; }
  .priority-baixa { background: #eff6ff; color: #2563eb; }
  .footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; background: #f3f4f6; border-radius: 0 0 8px 8px; }
</style></head>
<body>
  <div class="header">
    <h1>Plano de Ação — Riscos Psicossociais</h1>
    <p>${company?.legal_name || ""}</p>
  </div>
  <div class="content">
    ${customMessage ? `<div class="card"><p>${customMessage}</p></div>` : ""}
    <div class="card">
      <p><strong>Empresa:</strong> ${company?.legal_name || ""} ${company?.trade_name ? `(${company.trade_name})` : ""}</p>
      <p><strong>CNPJ:</strong> ${company?.cnpj || ""}</p>
      <p><strong>Avaliador:</strong> ${evaluator?.name || ""} — ${evaluator?.role_title || ""}</p>
    </div>
    <div class="stats">
      <div class="stat"><div class="num alta">${highCount}</div><div class="label">Prioridade Alta</div></div>
      <div class="stat"><div class="num media">${medCount}</div><div class="label">Prioridade Média</div></div>
      <div class="stat"><div class="num baixa">${lowCount}</div><div class="label">Prioridade Baixa</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Ação</th><th>Classificação</th><th>Prioridade</th></tr></thead>
      <tbody>
        ${plans.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${p.question_title}</strong><br><span style="color:#6b7280">${p.action_text}</span></td>
            <td>${p.classification}</td>
            <td class="priority-${p.priority.toLowerCase()}">${p.priority}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Este relatório foi gerado pela plataforma Med Work — Gestão de Riscos Ocupacionais</p>
    <p>Em caso de dúvidas, entre em contato pelo email psicossociais@medwork-to.com.br</p>
  </div>
</body>
</html>`;
}

function buildAdminReportEmail(
  company: any,
  evaluator: any,
  plans: any[],
  evaluation: any,
  customMessage?: string
): string {
  const date = evaluation?.finished_at
    ? new Date(evaluation.finished_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #1A8B9D, #0D4F5A); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
  .content { padding: 24px; background: #f9fafb; }
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .legal-notice { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .legal-notice h3 { color: #92400e; margin: 0 0 8px; font-size: 14px; }
  .legal-notice p { color: #78350f; font-size: 13px; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1A8B9D; color: white; padding: 8px 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #f9fafb; }
  .priority-alta { background: #fef2f2; color: #dc2626; font-weight: bold; }
  .priority-media { background: #fffbeb; color: #d97706; }
  .footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; background: #f3f4f6; border-radius: 0 0 8px 8px; }
</style></head>
<body>
  <div class="header">
    <h1>Relatório de Diagnóstico — Riscos Psicossociais</h1>
    <p>Conforme NR-1 e Lei 14.457/2022</p>
  </div>
  <div class="content">
    <div class="legal-notice">
      <h3>⚠ Aviso Importante — Resguardo Jurídico</h3>
      <p>Este documento comprova que a empresa ${company?.legal_name || ""} foi informada sobre as não conformidades identificadas na avaliação inicial de riscos psicossociais, realizada em ${date}. As ações listadas abaixo são de responsabilidade da empresa e devem ser implementadas nos prazos recomendados.</p>
    </div>
    ${customMessage ? `<div class="card"><p><strong>Mensagem:</strong> ${customMessage}</p></div>` : ""}
    <div class="card">
      <p><strong>Empresa:</strong> ${company?.legal_name || ""}</p>
      <p><strong>CNPJ:</strong> ${company?.cnpj || ""}</p>
      <p><strong>Responsável pela avaliação:</strong> ${evaluator?.name || ""}</p>
      <p><strong>Data do diagnóstico:</strong> ${date}</p>
      <p><strong>Total de ações identificadas:</strong> ${plans.length}</p>
    </div>
    <h3 style="color:#1A8B9D">Plano de Ação</h3>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>Ação Requerida</th><th>Classificação</th><th>Prioridade</th></tr></thead>
      <tbody>
        ${plans.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-size:11px">${p.question_title}</td>
            <td>${p.action_text}</td>
            <td>${p.classification}</td>
            <td class="priority-${p.priority.toLowerCase()}">${p.priority}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Med Work — Gestão de Riscos Ocupacionais | psicossociais@medwork-to.com.br</p>
    <p>Documento gerado automaticamente pela plataforma PsicoMed em ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
</body>
</html>`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
