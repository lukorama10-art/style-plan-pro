import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, QrCode, Copy, Loader2 } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const triedRef = useRef(false);

  const totalAmount = appointment.services?.reduce((sum, s) => sum + Number(s.price || 0), 0) || 0;

  const copyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleGenerate = async () => {
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
    try {
      const result: any = await generateBoleto.mutateAsync({
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
      const newBoletoId = result?.boleto?.id;
      if (newBoletoId && !result?.boleto?.pix_qr_code_url) {
        await refreshPixData.mutateAsync({ boletoId: newBoletoId });
      }
    } catch {
      // toast handled in mutation
    }
  };

  useEffect(() => {
    if (open && !boleto && !triedRef.current && !generateBoleto.isPending && clients) {
      triedRef.current = true;
      void handleGenerate();
    }
    if (!open) triedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, boleto, clients]);

  const loading = generateBoleto.isPending || refreshPixData.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
          <Receipt className="w-4 h-4 mr-1" />
          Cobrança
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Cobrança PIX</DialogTitle>
          <DialogDescription>
            Valor: {formatPrice(boleto ? Number(boleto.amount) : totalAmount)}
          </DialogDescription>
        </DialogHeader>

        {!boleto ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Gerando cobrança...</p>
          </div>
        ) : (
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
            ) : loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refreshPixData.mutate({ boletoId: boleto.id })}
              >
                Gerar QR Code PIX
              </Button>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
