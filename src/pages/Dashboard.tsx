import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";

const Dashboard = () => {
  // Dados mockados - será substituído por dados reais
  const stats = [
    {
      title: "Agendamentos Hoje",
      value: "12",
      change: "+2 desde ontem",
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Faturamento Hoje",
      value: "R$ 1.450",
      change: "+15%",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Novos Clientes",
      value: "5",
      change: "+3 esta semana",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Taxa de Ocupação",
      value: "85%",
      change: "+5%",
      icon: TrendingUp,
      color: "text-orange-600",
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
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  client: "Maria Silva",
                  service: "Corte de Cabelo",
                  time: "09:00",
                  professional: "Ana Costa",
                },
                {
                  client: "João Santos",
                  service: "Massagem",
                  time: "10:30",
                  professional: "Carlos Lima",
                },
                {
                  client: "Paula Oliveira",
                  service: "Manicure",
                  time: "11:00",
                  professional: "Beatriz Souza",
                },
              ].map((appointment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{appointment.client}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.service}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      {appointment.time}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.professional}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
