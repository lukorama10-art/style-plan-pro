import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Appointment {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  created_at: string;
  client?: {
    id: string;
    name: string;
    phone?: string;
  };
  professional?: {
    id: string;
    full_name: string;
  };
  services?: {
    id: string;
    name: string;
    duration: number;
    price: number;
  }[];
}

export interface AppointmentInput {
  client_id: string;
  professional_id: string;
  service_ids: string[];
  appointment_date: string;
  appointment_time: string;
  notes?: string;
}

export const useAppointments = (startDate?: string, endDate?: string) => {
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          client:clients(id, name, phone),
          professional:professionals(id, full_name)
        `)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (startDate && endDate) {
        query = query.gte("appointment_date", startDate).lte("appointment_date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch services for each appointment
      const appointmentsWithServices = await Promise.all(
        data.map(async (apt) => {
          const { data: appointmentServices, error: servicesError } = await supabase
            .from("appointment_services")
            .select(`
              service:services(id, name, duration, price)
            `)
            .eq("appointment_id", apt.id);

          if (servicesError) throw servicesError;

          return {
            ...apt,
            client: apt.client ? { ...apt.client } : undefined,
            professional: apt.professional ? { ...apt.professional } : undefined,
            services: appointmentServices?.map((as: any) => as.service).filter(Boolean) || [],
          };
        })
      );

      return appointmentsWithServices as Appointment[];
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (appointment: AppointmentInput) => {
      const { service_ids, ...appointmentData } = appointment;
      
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          ...appointmentData,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;

      // Insert services
      const serviceInserts = service_ids.map((service_id) => ({
        appointment_id: data.id,
        service_id,
      }));

      const { error: servicesError } = await supabase
        .from("appointment_services")
        .insert(serviceInserts);

      if (servicesError) throw servicesError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar agendamento: " + error.message);
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...appointment }: AppointmentInput & { id: string }) => {
      const { service_ids, ...appointmentData } = appointment;
      
      const { error } = await supabase
        .from("appointments")
        .update(appointmentData)
        .eq("id", id);

      if (error) throw error;

      // Delete existing services
      await supabase
        .from("appointment_services")
        .delete()
        .eq("appointment_id", id);

      // Insert new services
      const serviceInserts = service_ids.map((service_id) => ({
        appointment_id: id,
        service_id,
      }));

      const { error: servicesError } = await supabase
        .from("appointment_services")
        .insert(serviceInserts);

      if (servicesError) throw servicesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar agendamento: " + error.message);
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir agendamento: " + error.message);
    },
  });

  return {
    appointments,
    isLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
};
