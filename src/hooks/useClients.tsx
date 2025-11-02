import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientInput {
  name: string;
  email?: string;
  phone: string;
  notes?: string;
}

export const useClients = (searchTerm?: string) => {
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: ClientInput) => {
      const { data, error } = await supabase
        .from("clients")
        .insert([client])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar cliente: " + error.message);
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...client }: ClientInput & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(client)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir cliente: " + error.message);
    },
  });

  return {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
  };
};
