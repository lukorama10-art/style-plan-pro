import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useDashboardData = () => {
  const today = new Date();
  
  // Agendamentos de hoje
  const { data: todayAppointments, isLoading: loadingToday } = useQuery({
    queryKey: ["dashboard-today-appointments"],
    queryFn: async () => {
      const todayDate = format(today, "yyyy-MM-dd");
      
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          notes,
          clients (
            id,
            name
          ),
          professionals (
            id,
            full_name
          ),
          appointment_services (
            service_id,
            services (
              id,
              name,
              price,
              duration
            )
          )
        `)
        .eq("appointment_date", todayDate)
        .order("appointment_time", { ascending: true });

      if (error) throw error;

      return appointments?.map((apt: any) => ({
        id: apt.id,
        clientName: apt.clients?.name || "Cliente não encontrado",
        professionalName: apt.professionals?.full_name || "Profissional não encontrado",
        time: apt.appointment_time,
        services: apt.appointment_services?.map((as: any) => ({
          name: as.services?.name || "",
          price: Number(as.services?.price) || 0,
        })) || [],
        status: apt.status,
      })) || [];
    },
  });

  // Faturamento planejado do dia
  const { data: todayRevenue, isLoading: loadingTodayRevenue } = useQuery({
    queryKey: ["dashboard-today-revenue"],
    queryFn: async () => {
      const todayDate = format(today, "yyyy-MM-dd");
      
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_services (
            services (
              price
            )
          )
        `)
        .eq("appointment_date", todayDate)
        .neq("status", "cancelled");

      if (error) throw error;

      const total = appointments?.reduce((sum: number, apt: any) => {
        const aptTotal = apt.appointment_services?.reduce((serviceSum: number, as: any) => {
          return serviceSum + (Number(as.services?.price) || 0);
        }, 0) || 0;
        return sum + aptTotal;
      }, 0) || 0;

      return total;
    },
  });

  // Faturamento planejado da semana
  const { data: weekRevenue, isLoading: loadingWeekRevenue } = useQuery({
    queryKey: ["dashboard-week-revenue"],
    queryFn: async () => {
      const weekStart = format(startOfWeek(today, { locale: ptBR }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(today, { locale: ptBR }), "yyyy-MM-dd");
      
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_services (
            services (
              price
            )
          )
        `)
        .gte("appointment_date", weekStart)
        .lte("appointment_date", weekEnd)
        .neq("status", "cancelled");

      if (error) throw error;

      const total = appointments?.reduce((sum: number, apt: any) => {
        const aptTotal = apt.appointment_services?.reduce((serviceSum: number, as: any) => {
          return serviceSum + (Number(as.services?.price) || 0);
        }, 0) || 0;
        return sum + aptTotal;
      }, 0) || 0;

      return total;
    },
  });

  // Faturamento planejado do mês
  const { data: monthRevenue, isLoading: loadingMonthRevenue } = useQuery({
    queryKey: ["dashboard-month-revenue"],
    queryFn: async () => {
      const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");
      
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_services (
            services (
              price
            )
          )
        `)
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .neq("status", "cancelled");

      if (error) throw error;

      const total = appointments?.reduce((sum: number, apt: any) => {
        const aptTotal = apt.appointment_services?.reduce((serviceSum: number, as: any) => {
          return serviceSum + (Number(as.services?.price) || 0);
        }, 0) || 0;
        return sum + aptTotal;
      }, 0) || 0;

      return total;
    },
  });

  // Total de agendamentos de hoje
  const { data: todayAppointmentsCount } = useQuery({
    queryKey: ["dashboard-today-count"],
    queryFn: async () => {
      const todayDate = format(today, "yyyy-MM-dd");
      
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", todayDate);

      if (error) throw error;
      return count || 0;
    },
  });

  return {
    todayAppointments: todayAppointments || [],
    todayAppointmentsCount: todayAppointmentsCount || 0,
    todayRevenue: todayRevenue || 0,
    weekRevenue: weekRevenue || 0,
    monthRevenue: monthRevenue || 0,
    isLoading: loadingToday || loadingTodayRevenue || loadingWeekRevenue || loadingMonthRevenue,
  };
};
