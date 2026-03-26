import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import logo from "@/assets/logo-medwork.png";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, KeyRound, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAdminAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/admin/dashboard", { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    if (result.error) {
      setError("Credenciais inválidas. Verifique seu e-mail e senha.");
    } else {
      navigate("/admin/dashboard");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação");
    } else {
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setShowForgot(false);
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-reveal-up">
        <div className="text-center mb-8">
          <img src={logo} alt="Med Work" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground">Área administrativa</p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleLogin} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? "Verificando..." : "Entrar"}
            </button>

            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueci minha senha
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Recuperar Senha
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Informe seu e-mail para receber um link de recuperação.
            </p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar link de recuperação
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;
