import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatPrice } from "@/utils/priceFormatter";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const {
    todayAppointments,
    todayAppointmentsCount,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    isLoading,
  } = useDashboardData();

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">
          <p>Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      title: "Agendamentos Hoje",
      value: todayAppointmentsCount.toString(),
      icon: Calendar,
    },
    {
      title: "Faturamento Planejado Hoje",
      value: formatPrice(todayRevenue),
      icon: DollarSign,
    },
    {
      title: "Faturamento Planejado Semana",
      value: formatPrice(weekRevenue),
      icon: TrendingUp,
    },
    {
      title: "Faturamento Planejado Mês",
      value: formatPrice(monthRevenue),
      icon: DollarSign,
    },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo! Aqui está um resumo do seu negócio.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agendamentos de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum agendamento para hoje
              </p>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{appointment.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.services.map((s: any) => s.name).join(", ")}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-primary">
                          {appointment.time.substring(0, 5)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.professionalName}
                        </p>
                      </div>
                      <Badge variant={appointment.status === "completed" ? "default" : "secondary"}>
                        {appointment.status === "scheduled" ? "Agendado" : 
                         appointment.status === "completed" ? "Concluído" : "Cancelado"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
