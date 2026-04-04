import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Printer, TrendingUp, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useBoletos, type Boleto } from "@/hooks/useBoletos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatPrice } from "@/utils/priceFormatter";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const Financeiro = () => {
  const { monthlyRevenue, weeklyRevenue, isLoading } = useFinancialData();
  const { boletos, isLoading: isLoadingBoletos, deleteBoleto } = useBoletos();

  const getBoletoLink = (boleto: Boleto) =>
    boleto.boleto_url || boleto.bank_slip_url || boleto.invoice_url;

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case "RECEIVED":
      case "CONFIRMED":
        return "default" as const;
      case "OVERDUE":
      case "REFUNDED":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">
          <p>Carregando dados financeiros...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Financeiro</h1>
          <p className="text-muted-foreground">
            Análise de arrecadação e projeções
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Boletos gerados
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Os boletos são gerados automaticamente ao finalizar o agendamento e ficam disponíveis aqui para visualizar ou imprimir.
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingBoletos ? (
              <p className="text-sm text-muted-foreground">Carregando boletos...</p>
            ) : boletos?.length ? (
              <div className="space-y-4">
                {boletos.map((boleto) => {
                  const boletoLink = getBoletoLink(boleto);

                  return (
                    <div
                      key={boleto.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {boleto.description || "Boleto gerado"}
                            </p>
                            <Badge variant={getStatusVariant(boleto.status)}>
                              {boleto.status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Valor: {formatPrice(Number(boleto.amount))}</p>
                            <p>
                              Vencimento:{" "}
                              {new Date(`${boleto.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
                            </p>
                            <p>
                              Gerado em:{" "}
                              {new Date(boleto.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          {boleto.invoice_url ? (
                            <Button
                              type="button"
                              onClick={() => openInNewTab(boleto.invoice_url as string)}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Ver cobrança
                            </Button>
                          ) : (
                            <Button type="button" variant="outline" disabled>
                              Documento indisponível
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="destructive" size="icon">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cobrança</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBoleto.mutate(boleto.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não há boletos gerados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Arrecadação Mensal
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Receita bruta total por mês (incluindo projeções)
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Receita",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    tickFormatter={(value) => formatPrice(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: any, name: any, props: any) => {
                          const isProjected = props.payload?.projected;
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">
                                {formatPrice(Number(value))}
                              </span>
                              {isProjected && (
                                <span className="text-xs text-muted-foreground">
                                  (com projeção)
                                </span>
                              )}
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Arrecadação Futura Semanal
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Projeção de receita semana a semana (próximas 8 semanas)
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Receita",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    tickFormatter={(value) => formatPrice(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: any) => formatPrice(Number(value))}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Financeiro;
