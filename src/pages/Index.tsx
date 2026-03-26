import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-medwork.png";
import heroBg from "@/assets/hero-bg.jpg";
import { formatCNPJ, validateCNPJ, cleanCNPJ } from "@/utils/cnpj";
import { formatCPF, validateCPF, cleanCPF } from "@/utils/cpf";
import { Shield, ClipboardCheck, FileText, Loader2 } from "lucide-react";
import { getEvaluationsByCompanyCnpj } from "@/utils/database";
import { supabase } from "@/integrations/supabase/client";
import { useEvaluation } from "@/contexts/EvaluationContext";

const Index = () => {
  const [cnpj, setCnpj] = useState("");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorRole, setEvaluatorRole] = useState("");
  const [evaluatorCpf, setEvaluatorCpf] = useState("");
  const [evaluatorEmail, setEvaluatorEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [previousEvaluations, setPreviousEvaluations] = useState<any[] | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();
  const { setEvaluator } = useEvaluation();

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const clean = cleanCNPJ(cnpj);
    if (!validateCNPJ(clean)) newErrors.cnpj = "CNPJ inválido.";
    if (!evaluatorName.trim()) newErrors.name = "Nome é obrigatório.";
    if (!evaluatorRole.trim()) newErrors.role = "Função é obrigatória.";
    if (!validateCPF(cleanCPF(evaluatorCpf))) newErrors.cpf = "CPF inválido.";
    if (!validateEmail(evaluatorEmail)) newErrors.email = "E-mail inválido.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setAccessDenied(false);
    const clean = cleanCNPJ(cnpj);
    const cpfClean = cleanCPF(evaluatorCpf);

    // Save evaluator to context
    setEvaluator({
      name: evaluatorName.trim(),
      cpf: cpfClean,
      email: evaluatorEmail.trim(),
      roleTitle: evaluatorRole.trim(),
    });

    // Check if company exists and has access_cpf set
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("id, access_cpf")
        .eq("cnpj", clean)
        .maybeSingle();

      if (company) {
        // Company exists — check if access_cpf is set
        if (company.access_cpf) {
          // Has a bound CPF — verify it matches
          if (company.access_cpf !== cpfClean) {
            // CPF doesn't match — check for previous evaluations
            const existing = await getEvaluationsByCompanyCnpj(clean);
            if (existing.length > 0) {
              // Block access to previous reports
              setAccessDenied(true);
              setLoading(false);
              return;
            }
            // No previous evaluations, allow new one (and update access_cpf)
          }
        } else {
          // No access_cpf yet — bind this CPF
          await supabase
            .from("companies")
            .update({ access_cpf: cpfClean })
            .eq("id", company.id);
        }
      }

      // Check for existing evaluations
      const existing = await getEvaluationsByCompanyCnpj(clean);
      if (existing.length > 0) {
        setPreviousEvaluations(existing);
        setLoading(false);
        return;
      }
    } catch {
      // Continue to new evaluation if check fails
    }

    setLoading(false);
    navigate(`/empresa?cnpj=${clean}`);
  };

  const handleNewEvaluation = () => {
    setPreviousEvaluations(null);
    navigate(`/empresa?cnpj=${cleanCNPJ(cnpj)}`);
  };

  const handleViewPrevious = (evalId: string) => {
    navigate(`/resultado/${evalId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar with admin link */}
      <div className="w-full flex justify-end px-4 py-2 absolute top-0 left-0 right-0 z-20">
        <a href="/admin/login" className="text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors" aria-label="Acesso restrito">
          <Shield className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/85 to-white/95" />

        <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12 flex flex-col items-center text-center animate-reveal-up">
          <img src={logo} alt="Med Work" className="w-auto mb-6 cursor-pointer hover:opacity-80 transition-opacity" style={{ height: '200px' }} onClick={() => navigate("/")} />

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3" style={{ lineHeight: "1.15" }}>
            Avaliação inicial dos fatores de riscos psicossociais
          </h1>

          <p className="text-base text-primary font-medium mb-2">
            Vamos iniciar agora a conferência dos aspectos básicos de riscos psicossociais na sua empresa para gerar o seu plano de ação prévio.
          </p>

          <p className="text-sm text-muted-foreground mb-8 max-w-xl leading-relaxed">
            Ao final do preenchimento do checklist, você receberá um plano de ação com as ações imediatas que são obrigatórias ou recomendações indispensáveis pela equipe da Med Work, que faz a sua gestão de risco, para que você prepare a sua empresa para o levantamento dos riscos psicossociais.
          </p>

          {accessDenied ? (
            <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-foreground font-medium">
                Os dados informados não correspondem ao acesso anterior desta empresa.
              </p>
              <p className="text-xs text-muted-foreground">
                Para acessar relatórios anteriores, é necessário informar o CPF vinculado ao acesso anterior da empresa.
              </p>
              <button
                onClick={() => { setAccessDenied(false); setPreviousEvaluations(null); }}
                className="w-full py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 active:scale-[0.98] transition-all"
              >
                Tentar novamente
              </button>
            </div>
          ) : previousEvaluations ? (
            <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 text-left">
              <h3 className="text-lg font-bold text-foreground">Avaliações anteriores encontradas</h3>
              <p className="text-sm text-muted-foreground">Foram encontradas {previousEvaluations.length} avaliação(ões) para este CNPJ.</p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previousEvaluations.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleViewPrevious(ev.id)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {new Date(ev.startedAt).toLocaleDateString("pt-BR")} — {ev.evaluator.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ev.status === "completed" ? `${ev.totalActions} ações geradas` : "Em andamento"}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPreviousEvaluations(null)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 active:scale-[0.98] transition-all">
                  Voltar
                </button>
                <button onClick={handleNewEvaluation} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all">
                  Nova avaliação
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 text-left">
              {/* CNPJ */}
              <div>
                <label htmlFor="cnpj" className="block text-sm font-medium text-foreground mb-1">CNPJ da empresa *</label>
                <input id="cnpj" type="text" inputMode="numeric" placeholder="00.000.000/0000-00" value={cnpj}
                  onChange={(e) => { setCnpj(formatCNPJ(e.target.value)); setErrors((p) => ({ ...p, cnpj: "" })); }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {errors.cnpj && <p className="text-destructive text-xs mt-1">{errors.cnpj}</p>}
              </div>

              {/* Evaluator name */}
              <div>
                <label htmlFor="evalName" className="block text-sm font-medium text-foreground mb-1">Nome completo do avaliador *</label>
                <input id="evalName" type="text" placeholder="Nome completo" value={evaluatorName}
                  onChange={(e) => { setEvaluatorName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Evaluator role */}
              <div>
                <label htmlFor="evalRole" className="block text-sm font-medium text-foreground mb-1">Função / Cargo *</label>
                <input id="evalRole" type="text" placeholder="Ex: Gerente de RH" value={evaluatorRole}
                  onChange={(e) => { setEvaluatorRole(e.target.value); setErrors((p) => ({ ...p, role: "" })); }}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {errors.role && <p className="text-destructive text-xs mt-1">{errors.role}</p>}
              </div>

              {/* CPF */}
              <div>
                <label htmlFor="evalCpf" className="block text-sm font-medium text-foreground mb-1">CPF do avaliador *</label>
                <input id="evalCpf" type="text" inputMode="numeric" placeholder="000.000.000-00" value={evaluatorCpf}
                  onChange={(e) => { setEvaluatorCpf(formatCPF(e.target.value)); setErrors((p) => ({ ...p, cpf: "" })); }}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {errors.cpf && <p className="text-destructive text-xs mt-1">{errors.cpf}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="evalEmail" className="block text-sm font-medium text-foreground mb-1">E-mail do avaliador *</label>
                <input id="evalEmail" type="email" placeholder="email@empresa.com.br" value={evaluatorEmail}
                  onChange={(e) => { setEvaluatorEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : "Iniciar avaliação"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-card border-t border-border py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center animate-reveal-up" style={{ animationDelay: "0.2s" }}>
          {[
            { icon: ClipboardCheck, label: "Checklist rápido", desc: "Responda perguntas simples de Sim ou Não" },
            { icon: Shield, label: "Diagnóstico prévio", desc: "Identifique pontos críticos antes do levantamento formal" },
            { icon: FileText, label: "Plano de ação em PDF", desc: "Receba um documento pronto para uso imediato" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border flex flex-col items-center gap-1">
        <span>© {new Date().getFullYear()} Med Work — Gestão de Riscos Ocupacionais</span>
        <a href="/admin/login" className="text-muted-foreground/20 hover:text-muted-foreground/40 transition-colors" aria-label="Acesso restrito">
          <Shield className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
};

export default Index;
