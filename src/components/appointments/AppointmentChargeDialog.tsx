import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { useBoletos } from "@/hooks/useBoletos";
import { useClients } from "@/hooks/useClients";
import { formatPrice } from "@/utils/priceFormatter";
import { isValidCpf } from "@/utils/cpf";
import type { Appointment } from "@/hooks/useAppointments";

interface Props {
  appointment: Appointment;
}

export function AppointmentChargeDialog({ appointment }: Props) {
  const { boletos, refreshPixData, generateBoleto } = useBoletos();
  const { clients } = useClients();
  const boleto = boletos?.find((b) => b.appointment_id === appointment.id);

  const totalAmount = appointment.services?.reduce((sum, s) => sum + Number(s.price || 0), 0) || 0;

  const copyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleGenerate = () => {
    const client = clients?.find((c) => c.id === appointment.client_id);
    if (!client) {
      toast.error("Cliente não encontrado.");
      return;
    }
    if (!client.cpf || !isValidCpf(client.cpf)) {
      toast.error("Cliente sem CPF válido. Atualize o cadastro do cliente.");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("Valor do agendamento inválido.");
      return;
    }
    generateBoleto.mutate({
      appointment_id: appointment.id,
      client_id: client.id,
      client_name: client.name,
      client_cpf: client.cpf,
      client_email: client.email || undefined,
      amount: totalAmount,
      due_date: appointment.appointment_date,
      description: `Serviços: ${appointment.services?.map((s) => s.name).join(", ") || ""}`,
      billing_type: "UNDEFINED",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
          <Receipt className="w-4 h-4 mr-1" />
          Cobrança
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Cobrança do agendamento</DialogTitle>
          <DialogDescription>
            Visualize ou gere o QR Code PIX desta cobrança.
          </DialogDescription>
        </DialogHeader>

        {!boleto ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhuma cobrança gerada para este agendamento.
            </p>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generateBoleto.isPending}
              className="w-full"
            >
              {generateBoleto.isPending ? "Gerando..." : `Gerar cobrança PIX (${formatPrice(totalAmount)})`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <p><strong>Valor:</strong> {formatPrice(Number(boleto.amount))}</p>
              <p><strong>Status:</strong> {boleto.status}</p>
              <p><strong>Vencimento:</strong> {new Date(`${boleto.due_date}T00:00:00`).toLocaleDateString("pt-BR")}</p>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
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
                <p className="text-xs text-muted-foreground text-center">
                  QR Code ainda não disponível.
                </p>
              )}
              {boleto.pix_copia_e_cola && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyPix(boleto.pix_copia_e_cola!)}
                >
                  <Copy className="w-4 h-4" />
                  Copiar código PIX
                </Button>
              )}
              {!boleto.pix_qr_code_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refreshPixData.mutate({ boletoId: boleto.id })}
                  disabled={refreshPixData.isPending}
                >
                  {refreshPixData.isPending ? "Gerando..." : "Gerar QR Code PIX"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
