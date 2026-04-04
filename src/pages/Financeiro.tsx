import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Printer, TrendingUp, Trash2 } from "lucide-react";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
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
  const { boletos, isLoading: isLoadingBoletos, deleteBoleto, refreshPixData } = useBoletos();

  const getBoletoLink = (boleto: Boleto) =>
    boleto.boleto_url || boleto.bank_slip_url || boleto.invoice_url;

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código PIX copiado!");
  };

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
              Cobranças geradas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              As cobranças (PIX/Boleto) são geradas automaticamente ao finalizar o agendamento.
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingBoletos ? (
              <p className="text-sm text-muted-foreground">Carregando boletos...</p>
            ) : boletos?.length ? (
              <div className="space-y-4">
                {boletos.map((boleto) => {
                  const boletoLink = getBoletoLink(boleto);
                  const billingType = boleto.billing_type ?? (boleto.pix_qr_code_url || boleto.pix_copia_e_cola ? "PIX" : "BOLETO");
                  const hasPixData = Boolean(boleto.pix_qr_code_url || boleto.pix_copia_e_cola);
                  const canRefreshPix = billingType === "PIX" && boleto.asaas_payment_id && !hasPixData;

                  return (
                    <div
                      key={boleto.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {boleto.description || "Cobrança gerada"}
                            </p>
                            <Badge variant="outline">
                              {billingType === "PIX" ? "PIX" : "Boleto"}
                            </Badge>
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

                        {billingType === "PIX" && hasPixData && (
                          <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4">
                            <p className="text-sm font-medium flex items-center gap-1">
                              <QrCode className="w-4 h-4" /> QR Code PIX
                            </p>
                            {boleto.pix_qr_code_url ? (
                              <img
                                src={boleto.pix_qr_code_url}
                                alt="QR Code PIX"
                                className="w-48 h-48 rounded"
                              />
                            ) : (
                              <p className="text-xs text-muted-foreground text-center max-w-48">
                                QR Code ainda em processamento. Use o botão abaixo para abrir a cobrança.
                              </p>
                            )}
                            {boleto.pix_copia_e_cola && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => copyPixCode(boleto.pix_copia_e_cola!)}
                              >
                                <Copy className="w-4 h-4" />
                                Copiar código PIX
                              </Button>
                            )}
                            {canRefreshPix && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  refreshPixData.mutate({
                                    boletoId: boleto.id,
                                    asaasPaymentId: boleto.asaas_payment_id!,
                                  })
                                }
                                disabled={refreshPixData.isPending}
                              >
                                Atualizar PIX
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          {billingType === "PIX" && hasPixData ? null : boletoLink ? (
                            <Button
                              type="button"
                              onClick={() => openInNewTab(boletoLink as string)}
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
                Ainda não há cobranças geradas.
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
