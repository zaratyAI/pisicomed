import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { getAllEvaluations } from "@/utils/database";
import { computeAnalytics, getPipelineLabel } from "@/utils/analytics";
import logo from "@/assets/logo-medwork.png";
import {
  LogOut, Loader2, BarChart3, TrendingUp, Clock, AlertTriangle,
  ArrowLeft, Users, Building2, Activity, Target, XCircle, Sun, Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(180, 50%, 45%)",
];

const AnalyticsDashboardPage = () => {
  const navigate = useNavigate();
  const { logout, profile, roles } = useAdminAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [journeyMap, setJourneyMap] = useState<Record<string, any[]>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getAllEvaluations();
      setEvaluations(data);

      const evalIds = data.map((ev: any) => ev.id);
      if (evalIds.length > 0) {
        const [{ data: stages }, { data: logs }] = await Promise.all([
          supabase
            .from("journey_stages")
            .select("*")
            .in("evaluation_id", evalIds)
            .order("stage_code", { ascending: true }),
          supabase
            .from("stage_audit_logs")
            .select("*")
            .in("evaluation_id", evalIds)
            .order("created_at", { ascending: true }),
        ]);

        const map: Record<string, any[]> = {};
        (stages || []).forEach((s: any) => {
          if (!map[s.evaluation_id]) map[s.evaluation_id] = [];
          map[s.evaluation_id].push(s);
        });
        setJourneyMap(map);
        setAuditLogs(logs || []);
      }
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(
    () => computeAnalytics(evaluations, journeyMap, auditLogs),
    [evaluations, journeyMap, auditLogs]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const funnelData = [
    { name: "Propostas enviadas", value: analytics.byPipelineStatus["proposta_enviada"] || 0, fill: COLORS[0] },
    { name: "Aceitas", value: analytics.byPipelineStatus["proposta_aceita"] || 0, fill: COLORS[1] },
    { name: "Agendadas", value: analytics.byPipelineStatus["agendado"] || 0, fill: COLORS[2] },
    { name: "Realizadas", value: analytics.byPipelineStatus["em_realizacao"] || 0, fill: COLORS[3] },
    { name: "Finalizadas", value: analytics.byPipelineStatus["finalizado"] || 0, fill: COLORS[4] },
  ];

  const periodChartConfig: ChartConfig = {
    count: { label: "Casos", color: "hsl(var(--primary))" },
  };

  const backlogChartConfig: ChartConfig = {
    count: { label: "Casos", color: "hsl(var(--primary))" },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <img src={logo} alt="Med Work" className="h-9 w-auto" />
          <span className="text-sm font-medium text-primary hidden sm:inline">
            Visão Gerencial — Operação Nacional
          </span>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{profile.full_name || profile.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{roles[0] || "usuário"}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={<BarChart3 />} label="Total de casos" value={analytics.totalCases} />
          <KpiCard icon={<TrendingUp />} label="Finalizados" value={analytics.byPipelineStatus["finalizado"] || 0} color="text-emerald-600" />
          <KpiCard icon={<Target />} label="Conversão geral" value={analytics.conversionRates.overallConversion !== null ? `${analytics.conversionRates.overallConversion}%` : "—"} />
          <KpiCard icon={<Clock />} label="Tempo médio total" value={analytics.avgTotalDays !== null ? `${analytics.avgTotalDays}d` : "—"} />
          <KpiCard icon={<AlertTriangle />} label="Parados (>7d)" value={analytics.stalledCases.length} color="text-amber-600" />
          <KpiCard icon={<XCircle />} label="Cancelamento" value={analytics.conversionRates.cancellationRate !== null ? `${analytics.conversionRates.cancellationRate}%` : "—"} color="text-destructive" />
        </div>

        <Tabs defaultValue="funnel" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="funnel">Funil & Conversão</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="time">Tempo por Etapa</TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="ranking">Rankings</TabsTrigger>
          </TabsList>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Funil de Conversão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {funnelData.map((item, i) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold text-foreground">{item.value}</span>
                      </div>
                      <Progress
                        value={analytics.totalCases > 0 ? (item.value / analytics.totalCases) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Taxas de Conversão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ConversionRow label="Proposta → Aceite" rate={analytics.conversionRates.proposalToAccept} />
                  <ConversionRow label="Aceite → Agendamento" rate={analytics.conversionRates.acceptToSchedule} />
                  <ConversionRow label="Agendamento → Realização" rate={analytics.conversionRates.scheduleToRealization} />
                  <ConversionRow label="Conversão geral" rate={analytics.conversionRates.overallConversion} highlight />
                </CardContent>
              </Card>
            </div>

            {/* Distribution pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics.byPipelineStatus)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => ({ name: getPipelineLabel(k), value: v }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {Object.entries(analytics.byPipelineStatus)
                          .filter(([, v]) => v > 0)
                          .map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Volume Tab */}
          <TabsContent value="volume" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Volume por Período (últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={periodChartConfig} className="h-64">
                  <BarChart data={analytics.byPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Tab */}
          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Tempo Médio por Etapa (dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.avgTimePerStage.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Dados insuficientes — nenhuma etapa concluída ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.avgTimePerStage.map((s) => (
                      <div key={s.stage} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{s.stage}</span>
                          <span className="font-semibold text-foreground">{s.avgDays}d <span className="font-normal text-muted-foreground">({s.count} casos)</span></span>
                        </div>
                        <Progress value={Math.min(s.avgDays * 3, 100)} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {analytics.bottlenecks.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Gargalos Identificados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.bottlenecks.map((b) => (
                      <div key={b.stage} className="flex justify-between items-center text-sm">
                        <span className="text-foreground">{b.stage}</span>
                        <Badge variant="secondary" className="text-amber-700 bg-amber-100">
                          {b.avgDays} dias em média
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Backlog Tab */}
          <TabsContent value="backlog" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Backlog Operacional</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.backlogByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum caso ativo no momento.</p>
                ) : (
                  <ChartContainer config={backlogChartConfig} className="h-56">
                    <BarChart data={analytics.backlogByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="label" type="category" width={130} tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {analytics.stalledCases.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-destructive" /> Casos Parados ({analytics.stalledCases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Dias parado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.stalledCases.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs font-medium">{c.companyName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {getPipelineLabel(c.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-destructive">
                            {c.daysSinceUpdate}d
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Empresas com Mais Casos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topCompanies.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sem dados.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.topCompanies.map((c, i) => (
                        <div key={c.name} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground truncate max-w-[70%]">
                            <span className="text-foreground font-medium mr-2">{i + 1}.</span>
                            {c.name}
                          </span>
                          <Badge variant="secondary">{c.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" /> Avaliadores com Maior Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topEvaluators.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sem dados.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.topEvaluators.map((e, i) => (
                        <div key={e.name} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground truncate max-w-[70%]">
                            <span className="text-foreground font-medium mr-2">{i + 1}.</span>
                            {e.name}
                          </span>
                          <Badge variant="secondary">{e.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ── Sub-components ──

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <Card className="text-center">
      <CardContent className="pt-4 pb-3 px-3 space-y-1">
        <div className={`mx-auto w-fit ${color || "text-primary"}`}>{icon}</div>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

function ConversionRow({ label, rate, highlight }: { label: string; rate: number | null; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-sm ${highlight ? "pt-2 border-t border-border" : ""}`}>
      <span className={highlight ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`font-bold ${highlight ? "text-primary text-base" : "text-foreground"}`}>
        {rate !== null ? `${rate}%` : "—"}
      </span>
    </div>
  );
}

export default AnalyticsDashboardPage;
