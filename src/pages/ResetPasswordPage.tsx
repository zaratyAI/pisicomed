import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-medwork.png";
import { Loader2, KeyRound, Check } from "lucide-react";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        } else if (event === "SIGNED_IN" && session) {
          // Recovery flow also triggers SIGNED_IN with a session
          setReady(true);
        }
      }
    );

    // Also check if there's already an active session (user clicked link and session was set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Give Supabase a moment to process the URL hash tokens
        const timeout = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              setReady(true);
            } else {
              toast.error("Link de recuperação inválido ou expirado.");
              navigate("/admin/login");
            }
          });
        }, 2000);
        return () => clearTimeout(timeout);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Erro ao redefinir senha. Tente novamente.");
    } else {
      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/admin/login"), 2000);
    }
    setLoading(false);
  };

  if (!ready && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-reveal-up">
        <div className="text-center mb-8">
          <img src={logo} alt="Med Work" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Redefinir Senha</h1>
        </div>

        {success ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 text-center space-y-3">
            <Check className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm text-foreground font-medium">Senha redefinida com sucesso!</p>
            <p className="text-xs text-muted-foreground">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && <p className="text-destructive text-sm text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Redefinir Senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
