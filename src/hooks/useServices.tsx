import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // em minutos
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceInput {
  name: string;
  description?: string;
  duration: number;
  price: number;
  active?: boolean;
}

export const useServices = (searchTerm?: string) => {
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Service[];
    },
  });

  const createService = useMutation({
    mutationFn: async (service: ServiceInput) => {
      const { data, error } = await supabase
        .from("services")
        .insert([{ ...service, active: service.active ?? true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar serviço: " + error.message);
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...service }: ServiceInput & { id: string }) => {
      const { data, error } = await supabase
        .from("services")
        .update(service)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar serviço: " + error.message);
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir serviço: " + error.message);
    },
  });

  return {
    services,
    isLoading,
    createService,
    updateService,
    deleteService,
  };
};
