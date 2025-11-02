import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Agenda = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  const {
    appointments,
    isLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd")
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleSubmit = async (data: any) => {
    if (selectedAppointment) {
      await updateAppointment.mutateAsync({
        id: selectedAppointment.id,
        ...data,
      });
    } else {
      await createAppointment.mutateAsync(data);
    }
    setDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedAppointment) {
      await deleteAppointment.mutateAsync(selectedAppointment.id);
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments?.filter((apt) => apt.appointment_date === dateStr) || [];
  };

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Agenda</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={previousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(weekStart, "dd MMM", { locale: ptBR })} -{" "}
                {format(weekEnd, "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedAppointment(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <Card
                key={day.toString()}
                className={cn(
                  "p-4 min-h-[400px]",
                  isToday && "border-primary"
                )}
              >
                <div className="mb-4">
                  <div className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary"
                  )}>
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    isToday && "text-primary"
                  )}>
                    {format(day, "dd")}
                  </div>
                </div>

                <div className="space-y-2">
                  {dayAppointments.map((apt) => (
                    <Card
                      key={apt.id}
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleEdit(apt)}
                    >
                      <div className="text-sm font-medium">
                        {apt.appointment_time.slice(0, 5)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.client?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.service?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.professional?.full_name}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <AppointmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          appointment={selectedAppointment || undefined}
          isLoading={createAppointment.isPending || updateAppointment.isPending}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este agendamento? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export default Agenda;
