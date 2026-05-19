import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO, startOfWeek, endOfWeek, addWeeks, isFuture, isPast, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyRevenue {
  month: string;
  revenue: number;
  projected?: boolean;
}

interface WeeklyRevenue {
  week: string;
  revenue: number;
}

export const useFinancialData = () => {
  const { data: monthlyRevenue, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["financial-monthly"],
    queryFn: async () => {
      // Buscar todos os agendamentos dos últimos meses + futuros
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Últimos 6 meses
      
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Próximos 3 meses

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          appointment_services (
            service_id,
            services (
              price
            )
          )
        `)
        .gte("appointment_date", format(startDate, "yyyy-MM-dd"))
        .lte("appointment_date", format(endDate, "yyyy-MM-dd"))
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      // Agrupar por mês
      const monthlyData: { [key: string]: { revenue: number; hasCompleted: boolean; hasFuture: boolean } } = {};

      appointments?.forEach((appointment: any) => {
        const date = parseISO(appointment.appointment_date);
        const monthKey = format(date, "yyyy-MM");
        const isCompleted = appointment.status === "completed";
        const isFutureDate = isFuture(date);

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, hasCompleted: false, hasFuture: false };
        }

        if (isCompleted) {
          monthlyData[monthKey].hasCompleted = true;
        }
        if (isFutureDate || appointment.status === "scheduled") {
          monthlyData[monthKey].hasFuture = true;
        }

        // Somar preços dos serviços
        const serviceRevenue = appointment.appointment_services?.reduce((sum: number, as: any) => {
          return sum + (Number(as.services?.price) || 0);
        }, 0) || 0;

        monthlyData[monthKey].revenue += serviceRevenue;
      });

      // Converter para array e ordenar
      const result: MonthlyRevenue[] = Object.entries(monthlyData)
        .map(([month, data]) => {
          const date = parseISO(`${month}-01`);
          const isCurrentMonth = isThisMonth(date);
          
          return {
            month: format(date, "MMM/yy", { locale: ptBR }),
            revenue: data.revenue,
            projected: isCurrentMonth && data.hasFuture && data.hasCompleted,
          };
        })
        .sort((a, b) => {
          const dateA = parseISO(a.month.replace(/(\w+)\/(\d+)/, "20$2-$1-01"));
          const dateB = parseISO(b.month.replace(/(\w+)\/(\d+)/, "20$2-$1-01"));
          return dateA.getTime() - dateB.getTime();
        });

      return result;
    },
  });

  const { data: weeklyRevenue, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ["financial-weekly"],
    queryFn: async () => {
      // Buscar agendamentos futuros das próximas 8 semanas
      const today = new Date();
      const endDate = addWeeks(today, 8);

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          appointment_services (
            service_id,
            services (
              price
            )
          )
        `)
        .gte("appointment_date", format(today, "yyyy-MM-dd"))
        .lte("appointment_date", format(endDate, "yyyy-MM-dd"))
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      // Agrupar por semana
      const weeklyData: { [key: string]: number } = {};

      appointments?.forEach((appointment: any) => {
        const date = parseISO(appointment.appointment_date);
        const weekStart = startOfWeek(date, { locale: ptBR });
        const weekEnd = endOfWeek(date, { locale: ptBR });
        const weekKey = `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`;

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = 0;
        }

        // Somar preços dos serviços
        const serviceRevenue = appointment.appointment_services?.reduce((sum: number, as: any) => {
          return sum + (Number(as.services?.price) || 0);
        }, 0) || 0;

        weeklyData[weekKey] += serviceRevenue;
      });

      // Converter para array
      const result: WeeklyRevenue[] = Object.entries(weeklyData).map(([week, revenue]) => ({
        week,
        revenue,
      }));

      return result;
    },
  });

  return {
    monthlyRevenue,
    weeklyRevenue,
    isLoading: isLoadingMonthly || isLoadingWeekly,
  };
};
