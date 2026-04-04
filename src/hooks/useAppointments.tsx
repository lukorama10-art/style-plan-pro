import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isValidCpf } from "@/utils/cpf";

export interface Appointment {
  id: string;
  client_id: string;
  professional_id: string;
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

  // Function to check for scheduling conflicts
  const checkTimeConflict = async (
    professionalId: string,
    date: string,
    startTime: string,
    durationMinutes: number,
    excludeAppointmentId?: string
  ): Promise<{ hasConflict: boolean; conflictingAppointment?: any }> => {
    // Get all appointments for this professional on this date
    const { data: existingAppointments, error } = await supabase
      .from("appointments")
      .select(`
        *,
        client:clients(name)
      `)
      .eq("professional_id", professionalId)
      .eq("appointment_date", date)
      .neq("status", "cancelled");

    if (error) throw error;

    // Calculate end time for the new appointment
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const newStartMinutes = startHours * 60 + startMinutes;
    const newEndMinutes = newStartMinutes + durationMinutes;

    // Check each existing appointment for conflicts
    for (const existing of existingAppointments || []) {
      // Skip if this is the appointment being edited
      if (excludeAppointmentId && existing.id === excludeAppointmentId) {
        continue;
      }

      // Get services duration for existing appointment
      const { data: existingServices } = await supabase
        .from("appointment_services")
        .select(`
          service:services(duration)
        `)
        .eq("appointment_id", existing.id);

      const existingDuration = existingServices?.reduce(
        (total: number, item: any) => total + (item.service?.duration || 0),
        0
      ) || 0;

      // Calculate existing appointment time range
      const [existingHours, existingMinutes] = existing.appointment_time.split(":").map(Number);
      const existingStartMinutes = existingHours * 60 + existingMinutes;
      const existingEndMinutes = existingStartMinutes + existingDuration;

      // Check for overlap
      const hasOverlap = 
        (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
        (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
        (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes);

      if (hasOverlap) {
        return { 
          hasConflict: true, 
          conflictingAppointment: {
            ...existing,
            duration: existingDuration
          }
        };
      }
    }

    return { hasConflict: false };
  };

  const createAppointment = useMutation({
    mutationFn: async (appointment: AppointmentInput) => {
      const { service_ids, ...appointmentData } = appointment;
      
      // Get total duration and price of selected services
      const { data: servicesData } = await supabase
        .from("services")
        .select("duration, price, name")
        .in("id", service_ids);

      const totalDuration = servicesData?.reduce(
        (total, service) => total + service.duration,
        0
      ) || 0;

      const totalPrice = servicesData?.reduce(
        (total, service) => total + Number(service.price),
        0
      ) || 0;

      const serviceNames = servicesData?.map(s => s.name).join(", ") || "";

      // Check for conflicts
      const conflictCheck = await checkTimeConflict(
        appointmentData.professional_id,
        appointmentData.appointment_date,
        appointmentData.appointment_time,
        totalDuration
      );

      if (conflictCheck.hasConflict) {
        const conflict = conflictCheck.conflictingAppointment;
        const conflictEndTime = new Date(
          new Date(`2000-01-01T${conflict.appointment_time}`).getTime() + 
          conflict.duration * 60000
        ).toTimeString().slice(0, 5);

        throw new Error(
          `Horário indisponível! Já existe agendamento de ${conflict.client.name} das ${conflict.appointment_time} às ${conflictEndTime}`
        );
      }

      const { data, error } = await supabase
        .from("appointments")
        .insert([{
          ...appointmentData,
          status: "scheduled",
        }] as any)
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

      // Generate boleto automatically
      try {
        // Get client info
        const { data: clientData } = await supabase
          .from("clients")
          .select("name, email, cpf")
          .eq("id", appointmentData.client_id)
          .single();

        if (clientData && totalPrice > 0) {
          if (!clientData.cpf || !isValidCpf(clientData.cpf)) {
            toast.error("Agendamento criado! A cobrança não foi gerada porque o CPF do cliente é inválido.");
            return data;
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const dueDate = appointmentData.appointment_date;
            const response = await supabase.functions.invoke("generate-boleto", {
              body: {
                appointment_id: data.id,
                client_id: appointmentData.client_id,
                client_name: clientData.name,
                client_cpf: clientData.cpf || undefined,
                client_email: clientData.email || undefined,
                amount: totalPrice,
                due_date: dueDate,
                description: `Serviços: ${serviceNames}`,
                billing_type: "BOLETO",

              },
            });
            if (response.error) {
              throw new Error(response.error.message || "Erro ao gerar cobrança");
            }
            if (response.data && !response.data.success) {
              throw new Error(response.data.error);
            }
            toast.success("Agendamento criado com sucesso! Cobrança gerada.");
          }
        }
      } catch (boletoError: any) {
        console.error("Erro ao gerar boleto:", boletoError);
        const msg = boletoError?.message || "Erro desconhecido";
        if (msg.includes("CPF")) {
          toast.error("Agendamento criado! Para gerar boleto, cadastre o CPF do cliente na aba Clientes.");
        } else {
          toast.error(`Agendamento criado, mas houve erro ao gerar o boleto: ${msg}`);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      toast.success("Agendamento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar agendamento");
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...appointment }: AppointmentInput & { id: string }) => {
      const { service_ids, ...appointmentData } = appointment;
      
      // Get total duration of selected services
      const { data: servicesData } = await supabase
        .from("services")
        .select("duration")
        .in("id", service_ids);

      const totalDuration = servicesData?.reduce(
        (total, service) => total + service.duration,
        0
      ) || 0;

      // Check for conflicts (excluding current appointment)
      const conflictCheck = await checkTimeConflict(
        appointmentData.professional_id,
        appointmentData.appointment_date,
        appointmentData.appointment_time,
        totalDuration,
        id
      );

      if (conflictCheck.hasConflict) {
        const conflict = conflictCheck.conflictingAppointment;
        const conflictEndTime = new Date(
          new Date(`2000-01-01T${conflict.appointment_time}`).getTime() + 
          conflict.duration * 60000
        ).toTimeString().slice(0, 5);

        throw new Error(
          `Horário indisponível! Já existe agendamento de ${conflict.client.name} das ${conflict.appointment_time} às ${conflictEndTime}`
        );
      }

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
      toast.error(error.message || "Erro ao atualizar agendamento");
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
