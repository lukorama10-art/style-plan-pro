import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Boleto {
  id: string;
  appointment_id: string | null;
  client_id: string | null;
  asaas_payment_id: string | null;
  asaas_customer_id: string | null;
  amount: number;
  due_date: string;
  status: string;
  boleto_url: string | null;
  bank_slip_url: string | null;
  invoice_url: string | null;
  description: string | null;
  created_at: string;
  billing_type: string;
  pix_qr_code_url: string | null;
  pix_copia_e_cola: string | null;
}

export const useBoletos = () => {
  const queryClient = useQueryClient();

  const { data: boletos, isLoading } = useQuery({
    queryKey: ["boletos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Boleto[];
    },
  });

  const generateBoleto = useMutation({
    mutationFn: async (params: {
      appointment_id?: string;
      client_id: string;
      client_name: string;
      client_cpf?: string;
      client_email?: string;
      amount: number;
      due_date: string;
      description?: string;
      billing_type?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("generate-boleto", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao gerar boleto");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Erro ao gerar boleto");
      }

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });

      if (result?.pix_pending) {
        toast.warning(result?.pix_error || "Cobrança gerada, mas o QR Code PIX ainda não ficou disponível no gateway.");
        return;
      }

      if (result?.pix_error) {
        toast.warning(result.pix_error);
        return;
      }

      toast.success("Boleto gerado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao gerar boleto");
    },
  });

  const deleteBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boletos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast.success("Cobrança excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir cobrança");
    },
  });

  const refreshPixData = useMutation({
    mutationFn: async ({ boletoId, asaasPaymentId }: { boletoId: string; asaasPaymentId: string }) => {
      const response = await supabase.functions.invoke("generate-boleto", {
        body: {
          action: "refresh_pix",
          boleto_id: boletoId,
          asaas_payment_id: asaasPaymentId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao carregar PIX");
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      if (data?.boleto?.found === false || data?.success === false) {
        toast.warning(data?.error || "QR Code PIX ainda não disponível. Tente novamente em alguns minutos.");
        return;
      }

      toast.success("PIX carregado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao carregar PIX");
    },
  });

  return {
    boletos,
    isLoading,
    generateBoleto,
    deleteBoleto,
    refreshPixData,
  };
};
