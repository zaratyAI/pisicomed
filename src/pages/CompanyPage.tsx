import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lookupCNPJ, CompanyData, formatCNPJ, cleanCNPJ } from "@/utils/cnpj";
import { useEvaluation } from "@/contexts/EvaluationContext";
import { upsertCompany, upsertEvaluator, createEvaluation } from "@/utils/database";
import { questions } from "@/data/questions";
import logo from "@/assets/logo-medwork.png";
import { Building2, MapPin, Loader2, AlertTriangle, User } from "lucide-react";

const CompanyPage = () => {
  const [searchParams] = useSearchParams();
  const cnpjParam = searchParams.get("cnpj") || "";
  const navigate = useNavigate();
  const { setCompany, evaluator, setEvaluationId } = useEvaluation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<CompanyData | null>(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState<CompanyData>({
    cnpj: formatCNPJ(cnpjParam),
    legalName: "", tradeName: "", address: "", city: "", state: "", zipCode: "", status: "",
  });

  useEffect(() => {
    if (!cnpjParam) { navigate("/"); return; }
    if (!evaluator) { navigate("/"); return; }
    lookupCNPJ(cnpjParam)
      .then((d) => { setData(d); setForm(d); })
      .catch(() => { setError("Não foi possível consultar o CNPJ. Preencha os dados manualmente."); setManual(true); })
      .finally(() => setLoading(false));
  }, [cnpjParam, navigate, evaluator]);

  const handleConfirm = async () => {
    const company = data && !manual ? data : form;
    if (!company.legalName.trim() || !evaluator) return;

    setSaving(true);
    try {
      // Save company & evaluator to database and create evaluation
      const companyId = await upsertCompany(company, evaluator.cpf);
      const evaluatorId = await upsertEvaluator(evaluator);
      const evaluationId = await createEvaluation(companyId, evaluatorId, questions.length);
      
      setCompany(company);
      setEvaluationId(evaluationId);
      navigate("/avaliacao");
    } catch (err) {
      console.error("Error saving:", err);
      // Still allow proceeding even if DB save fails
      setCompany(company);
      navigate("/avaliacao");
    } finally {
      setSaving(false);
    }
  };

  const display = manual ? form : data;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <img src={logo} alt="Med Work" className="h-10 w-auto cursor-pointer" onClick={() => navigate("/avaliador")} />
        <span className="text-sm font-medium text-muted-foreground">Identificação da empresa</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg animate-reveal-up">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Consultando CNPJ...</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {manual ? "Dados da empresa" : "Confirme os dados"}
                </h2>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {manual ? (
                <div className="space-y-3">
                  {[
                    { key: "legalName", label: "Razão Social *" },
                    { key: "tradeName", label: "Nome Fantasia" },
                    { key: "address", label: "Endereço" },
                    { key: "city", label: "Cidade" },
                    { key: "state", label: "UF" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input
                        value={form[key as keyof CompanyData]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  ))}
                </div>
              ) : display ? (
                <div className="space-y-3 text-sm">
                  <InfoRow label="CNPJ" value={display.cnpj} />
                  <InfoRow label="Razão Social" value={display.legalName} />
                  {display.tradeName && <InfoRow label="Nome Fantasia" value={display.tradeName} />}
                  <InfoRow label="Endereço" value={display.address} icon={<MapPin className="w-3.5 h-3.5" />} />
                  <InfoRow label="Cidade/UF" value={`${display.city} - ${display.state}`} />
                  {display.status && <InfoRow label="Situação" value={display.status} />}
                </div>
              ) : null}

              {/* Evaluator info */}
              {evaluator && (
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-semibold text-foreground">Avaliador</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <InfoRow label="Nome" value={evaluator.name} />
                    <InfoRow label="Função" value={evaluator.roleTitle} />
                    <InfoRow label="E-mail" value={evaluator.email} />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => navigate("/")}
                  className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted/50 active:scale-[0.98] transition-all">
                  Voltar
                </button>
                <button onClick={handleConfirm} disabled={(manual && !form.legalName.trim()) || saving}
                  className="flex-1 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Confirmar e iniciar"}
                </button>
              </div>

              {!manual && (
                <button onClick={() => { setManual(true); setError(""); }}
                  className="text-xs text-muted-foreground hover:text-primary underline mx-auto block">
                  Editar dados manualmente
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

export default CompanyPage;
