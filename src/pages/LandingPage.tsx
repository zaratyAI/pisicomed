import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/logo-medwork.png";
import {
  Shield,
  ClipboardCheck,
  FileText,
  Users,
  BarChart3,
  FileCheck,
  ChevronRight,
  Play,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Scale,
} from "lucide-react";

const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

const Section = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const journeySteps = [
  { icon: ClipboardCheck, label: "Avaliação com alta gestão", desc: "Entrevista com lideranças e diretoria" },
  { icon: Users, label: "Questionários com funcionários", desc: "Aplicação com todos os colaboradores" },
  { icon: BarChart3, label: "Análise dos dados", desc: "Processamento e interpretação técnica" },
  { icon: FileCheck, label: "Atualização do PGR", desc: "Inventário de riscos e plano de ação" },
  { icon: FileText, label: "Documento final", desc: "Relatório completo e definitivo" },
];

/* Med Work brand colors */
const BLUE = "#1A8B9D";    // azul institucional
const GREEN = "#2E9E6B";   // verde institucional
const GOLD = "#C9A86A";    // dourado - apenas detalhe

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((p) => (p >= journeySteps.length ? -1 : p + 1));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "linear-gradient(165deg, #071A1E 0%, #0A1F1A 40%, #0D1B24 70%, #091215 100%)" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ background: "rgba(7, 26, 30, 0.85)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <img src={logo} alt="Med Work" className="h-10" />
          <div className="flex items-center gap-4">
            <a
              href="/admin/login"
              className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => navigate("/avaliador")}
              className="px-5 py-2 rounded-full text-sm font-semibold text-white hover:brightness-110 active:scale-[0.97] transition-all"
              style={{ background: `linear-gradient(135deg, ${BLUE}, ${GREEN})`, boxShadow: `0 4px 20px ${BLUE}40` }}
            >
              Iniciar avaliação
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex items-center justify-center pt-24 pb-16">
        {/* Ambient glows — blue + green */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none" style={{ background: `${BLUE}12` }} />
        <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: `${GREEN}10` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${BLUE}30, ${GREEN}30, transparent)` }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-6">
          <Section>
            <div className="flex flex-col items-center gap-3 mb-4">
              <img src={logo} alt="Med Work" className="h-60" />
              <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: BLUE }}>
                Regularize sua empresa conforme a nova NR-1
              </p>
            </div>
          </Section>

          <Section delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              Prepare sua empresa antes da{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${BLUE}, ${GREEN})` }}>
                avaliação completa
              </span>{" "}
              dos riscos psicossociais
            </h1>
          </Section>

          <Section delay={200}>
            <p className="text-lg sm:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed">
              Esta etapa inicial identifica se sua empresa já possui os elementos básicos, obrigatórios e indispensáveis antes do processo técnico completo.
            </p>
          </Section>
        </div>
      </section>

      {/* Explanation block */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <Section>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: GREEN }}>Entenda a ferramenta</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Esta <span style={{ color: BLUE }}>não é</span> a avaliação completa
              </h2>
              <p className="text-white/45 max-w-2xl mx-auto text-lg">
                É uma etapa preparatória que antecipa o básico e ajuda a empresa a não chegar despreparada ao processo técnico formal.
              </p>
            </div>
          </Section>

          <Section delay={100}>
            <div className="rounded-2xl p-8 sm:p-12 text-center" style={{ background: "rgba(26, 139, 157, 0.04)", border: `1px solid ${BLUE}18` }}>
              <p className="text-xl sm:text-2xl text-white/75 leading-relaxed font-light italic">
                "O que já é obrigatório, conhecido e estrutural precisa ser identificado agora.{" "}
                <span className="font-medium not-italic" style={{ color: GREEN }}>
                  O que for específico será tratado nas próximas etapas.
                </span>"
              </p>
            </div>
          </Section>

          <Section delay={200}>
            <div className="grid sm:grid-cols-3 gap-6 mt-12">
              {[
                { icon: ClipboardCheck, title: "Checklist rápido", desc: "Perguntas diretas de Sim ou Não sobre conformidade básica", color: BLUE },
                { icon: Shield, title: "Diagnóstico prévio", desc: "Identifique pontos críticos antes do levantamento formal", color: GREEN },
                { icon: FileText, title: "Plano de ação em PDF", desc: "Documento pronto com ações imediatas e obrigatórias", color: BLUE },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl p-6 transition-all duration-300 hover:translate-y-[-2px]"
                  style={{
                    background: `${item.color}06`,
                    border: `1px solid ${item.color}15`,
                    boxShadow: `0 4px 24px ${item.color}08`,
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${item.color}15` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* Video section */}
      <section className="py-24 px-6 border-t border-white/5" style={{ background: "rgba(26, 139, 157, 0.02)" }}>
        <div className="max-w-4xl mx-auto">
          <Section>
            <div className="text-center mb-12">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: GREEN }}>Vídeo explicativo</p>
              <h2 className="text-3xl sm:text-4xl font-bold">
                Entenda como essa ferramenta prepara sua empresa
              </h2>
            </div>
          </Section>

          <Section delay={100}>
            <div
              className="relative aspect-video rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300"
              style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}18` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${BLUE}25`, boxShadow: `0 0 40px ${BLUE}20` }}
                >
                  <Play className="w-8 h-8 ml-1" style={{ color: BLUE }} />
                </div>
              </div>
              <p className="absolute bottom-6 left-0 right-0 text-center text-white/25 text-sm">
                Vídeo em breve disponível
              </p>
            </div>
          </Section>
        </div>
      </section>

      {/* Journey animation */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <Section>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Jornada completa</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Conheça as etapas do processo completo
              </h2>
              <p className="text-white/45 max-w-xl mx-auto">
                A avaliação completa dos riscos psicossociais segue estas etapas técnicas.
              </p>
            </div>
          </Section>

          <Section delay={100}>
            <div className="relative">
              {/* Connection line */}
              <div className="hidden sm:block absolute top-8 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${BLUE}20, ${GREEN}20)` }} />

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                {journeySteps.map((step, i) => {
                  const stepColor = i % 2 === 0 ? BLUE : GREEN;
                  return (
                    <div
                      key={step.label}
                      className={`relative flex flex-col items-center text-center transition-all duration-500 ${
                        activeStep >= i ? "opacity-100 scale-100" : "opacity-30 scale-95"
                      }`}
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500"
                        style={activeStep >= i
                          ? { background: `${stepColor}20`, border: `1px solid ${stepColor}50` }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
                        }
                      >
                        <step.icon
                          className="w-6 h-6 transition-colors duration-500"
                          style={{ color: activeStep >= i ? stepColor : "rgba(255,255,255,0.25)" }}
                        />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">{step.label}</h3>
                      <p className="text-xs text-white/40">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* Differential — action plan highlight */}
      <section className="py-24 px-6 border-t border-white/5" style={{ background: `linear-gradient(180deg, ${GREEN}06 0%, transparent 100%)` }}>
        <div className="max-w-5xl mx-auto">
          <Section>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: GREEN }}>O diferencial</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                O plano de ação <span style={{ color: GREEN }}>antecipado</span>
              </h2>
              <p className="text-white/45 max-w-2xl mx-auto text-lg">
                Normalmente o plano de ação vem ao final de todo o processo. Esta ferramenta antecipa o básico para que sua empresa comece a agir agora.
              </p>
            </div>
          </Section>

          <Section delay={100}>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              {["Avaliação", "Questionários", "Análise", "PGR"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs text-white/40 font-medium"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs text-white/30 hidden sm:inline">{s}</span>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-white/10 hidden sm:block" />}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-white/10 hidden sm:block" />
                <div
                  className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                  style={{ background: `${GREEN}20`, border: `1px solid ${GREEN}40`, color: GREEN }}
                >
                  <FileText className="w-4 h-4" />
                  Plano de Ação
                </div>
              </div>
            </div>

            {/* Arrow pulling plan forward */}
            <div className="flex justify-center my-8">
              <div className="flex flex-col items-center gap-2" style={{ color: GOLD }}>
                <div className="w-px h-12" style={{ background: `linear-gradient(to bottom, ${GOLD}50, ${GOLD})` }} />
                <Sparkles className="w-5 h-5 animate-pulse" />
                <p className="text-sm font-semibold">Antecipado para AGORA</p>
              </div>
            </div>

            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}20` }}
            >
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${GREEN}20` }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: GREEN }} />
              </div>
              <h3 className="text-xl font-bold mb-2">Plano de ação prévio gerado automaticamente</h3>
              <p className="text-white/45 max-w-lg mx-auto">
                Ao finalizar o checklist, você recebe imediatamente as ações obrigatórias e recomendações indispensáveis para preparar sua empresa.
              </p>
            </div>
          </Section>
        </div>
      </section>

      {/* Strategic text block */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <Section>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">A maioria das empresas não tem o mínimo</h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Muitas organizações chegam ao processo completo sem os elementos básicos obrigatórios, gerando fragilidade regulatória e exposição a riscos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${GOLD}15` }}>
                    <Scale className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Blindagem jurídica começa aqui</h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Identificar e corrigir o básico antes do processo formal fortalece a posição da empresa perante auditorias e fiscalizações.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${BLUE}15` }}>
                    <Shield className="w-5 h-5" style={{ color: BLUE }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Preparação inteligente</h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Esta ferramenta corrige as lacunas básicas e prepara a empresa para que o processo completo seja mais eficiente e assertivo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${GREEN}15` }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Ação imediata</h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      O plano de ação gerado ao final permite que a empresa comece a agir imediatamente, sem esperar o fim de todo o processo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 border-t border-white/5" style={{ background: `linear-gradient(0deg, ${BLUE}08 0%, transparent 100%)` }}>
        <div className="max-w-3xl mx-auto text-center">
          <Section>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Comece agora a avaliação inicial da sua empresa
            </h2>
            <p className="text-white/45 mb-8 text-lg">
              Identifique o que precisa ser ajustado antes do processo completo.
            </p>
            <button
              onClick={() => navigate("/avaliador")}
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-full text-lg font-bold text-white hover:brightness-110 active:scale-[0.97] transition-all"
              style={{
                background: `linear-gradient(135deg, ${BLUE}, ${GREEN})`,
                boxShadow: `0 8px 32px ${BLUE}30, 0 0 0 1px ${GOLD}20`,
              }}
            >
              Iniciar avaliação
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Section>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} Med Work — Gestão de Riscos Ocupacionais
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
