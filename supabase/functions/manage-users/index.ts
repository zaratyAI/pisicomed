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
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Não autenticado" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return json({ success: false, error: "Não autenticado" }, 401);
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return json({ success: false, error: "Apenas administradores podem gerenciar usuários" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_user": {
        const { email, password, full_name, role } = body;
        if (!email || !password || !role) {
          return json({ success: false, error: "email, password e role são obrigatórios" }, 400);
        }

        // Create auth user using admin API
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || "" },
        });

        if (createError) {
          return json({ success: false, error: createError.message }, 400);
        }

        // Assign role
        await supabase.from("user_roles").insert({
          user_id: newUser.user.id,
          role,
        });

        return json({ success: true, user_id: newUser.user.id });
      }

      case "list_users": {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role");

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, is_active, created_at");

        const users = (profiles || []).map((p: any) => ({
          ...p,
          roles: (roles || []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
        }));

        return json({ success: true, users });
      }

      case "update_role": {
        const { user_id, role, operation } = body;
        if (!user_id || !role) {
          return json({ success: false, error: "user_id e role são obrigatórios" }, 400);
        }

        if (operation === "remove") {
          await supabase.from("user_roles").delete()
            .eq("user_id", user_id).eq("role", role);
        } else {
          await supabase.from("user_roles").upsert(
            { user_id, role },
            { onConflict: "user_id,role" }
          );
        }

        return json({ success: true });
      }

      case "deactivate_user": {
        const { user_id } = body;
        if (!user_id) return json({ success: false, error: "user_id é obrigatório" }, 400);

        await supabase.from("profiles").update({ is_active: false }).eq("id", user_id);
        return json({ success: true });
      }

      default:
        return json({ success: false, error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("User management error:", err);
    return json({ success: false, error: err.message || "Erro interno" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
