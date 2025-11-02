import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Professional {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  services?: string[]; // IDs dos serviços
  availability?: Availability[];
}

export interface Availability {
  day_of_week: number; // 0 = Domingo, 1 = Segunda, etc
  periods: string[]; // ["morning", "afternoon"]
}

export interface ProfessionalInput {
  full_name: string;
  phone?: string;
  email?: string;
  services: string[];
  availability: Availability[];
}

export const useProfessionals = (searchTerm?: string) => {
  const queryClient = useQueryClient();

  const { data: professionals, isLoading } = useQuery({
    queryKey: ["professionals", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .eq("role", "professional")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Buscar serviços e disponibilidade para cada profissional
      const professionalsWithDetails = await Promise.all(
        profiles.map(async (profile) => {
          // Buscar serviços
          const { data: services } = await supabase
            .from("professional_services")
            .select("service_id")
            .eq("professional_id", profile.id);

          // Buscar disponibilidade
          const { data: availability } = await supabase
            .from("availability")
            .select("*")
            .eq("professional_id", profile.id)
            .order("day_of_week");

          // Agrupar disponibilidade por dia
          const groupedAvailability = availability?.reduce((acc, curr) => {
            const existing = acc.find((a) => a.day_of_week === curr.day_of_week);
            const period = curr.start_time === "08:00:00" ? "morning" : "afternoon";
            
            if (existing) {
              existing.periods.push(period);
            } else {
              acc.push({
                day_of_week: curr.day_of_week,
                periods: [period],
              });
            }
            return acc;
          }, [] as Availability[]);

          return {
            ...profile,
            services: services?.map((s) => s.service_id) || [],
            availability: groupedAvailability || [],
          };
        })
      );

      return professionalsWithDetails as Professional[];
    },
  });

  const createProfessional = useMutation({
    mutationFn: async (professional: ProfessionalInput) => {
      // Criar profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          full_name: professional.full_name,
          phone: professional.phone,
          role: "professional",
        } as any)
        .select()
        .single();

      if (profileError) throw profileError;

      // Adicionar serviços
      if (professional.services.length > 0) {
        const { error: servicesError } = await supabase
          .from("professional_services")
          .insert(
            professional.services.map((serviceId) => ({
              professional_id: profile.id,
              service_id: serviceId,
            }))
          );

        if (servicesError) throw servicesError;
      }

      // Adicionar disponibilidade
      if (professional.availability.length > 0) {
        const availabilityRecords = professional.availability.flatMap((avail) =>
          avail.periods.map((period) => ({
            professional_id: profile.id,
            day_of_week: avail.day_of_week,
            start_time: period === "morning" ? "08:00:00" : "13:00:00",
            end_time: period === "morning" ? "12:00:00" : "18:00:00",
            is_available: true,
          }))
        );

        const { error: availError } = await supabase
          .from("availability")
          .insert(availabilityRecords);

        if (availError) throw availError;
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Profissional cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar profissional: " + error.message);
    },
  });

  const updateProfessional = useMutation({
    mutationFn: async ({
      id,
      ...professional
    }: ProfessionalInput & { id: string }) => {
      // Atualizar profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: professional.full_name,
          phone: professional.phone,
        })
        .eq("id", id);

      if (profileError) throw profileError;

      // Remover serviços antigos e adicionar novos
      await supabase
        .from("professional_services")
        .delete()
        .eq("professional_id", id);

      if (professional.services.length > 0) {
        const { error: servicesError } = await supabase
          .from("professional_services")
          .insert(
            professional.services.map((serviceId) => ({
              professional_id: id,
              service_id: serviceId,
            }))
          );

        if (servicesError) throw servicesError;
      }

      // Remover disponibilidade antiga e adicionar nova
      await supabase.from("availability").delete().eq("professional_id", id);

      if (professional.availability.length > 0) {
        const availabilityRecords = professional.availability.flatMap((avail) =>
          avail.periods.map((period) => ({
            professional_id: id,
            day_of_week: avail.day_of_week,
            start_time: period === "morning" ? "08:00:00" : "13:00:00",
            end_time: period === "morning" ? "12:00:00" : "18:00:00",
            is_available: true,
          }))
        );

        const { error: availError } = await supabase
          .from("availability")
          .insert(availabilityRecords);

        if (availError) throw availError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Profissional atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar profissional: " + error.message);
    },
  });

  const deleteProfessional = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Profissional excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir profissional: " + error.message);
    },
  });

  return {
    professionals,
    isLoading,
    createProfessional,
    updateProfessional,
    deleteProfessional,
  };
};
