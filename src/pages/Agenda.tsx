import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { AppointmentChargeDialog } from "@/components/appointments/AppointmentChargeDialog";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
    updateStatus,
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

  const calculateEndTime = (startTime: string, services: { duration: number }[] = []) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = services.reduce((acc, s) => acc + s.duration, 0);
    const endDate = new Date();
    endDate.setHours(hours, minutes + totalMinutes);
    return format(endDate, 'HH:mm');
  };

  const handleDeleteFromDialog = (id: string) => {
    deleteAppointment.mutateAsync(id);
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

        <div className="border rounded-lg overflow-auto">
          <table className="w-full border-collapse">
            <tbody>
              {weekDays.map((day, dayIndex) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isLastDay = dayIndex === weekDays.length - 1;
                
                return (
                  <>
                    <tr key={`day-${day.toString()}`} className="border-b">
                      <td
                        className={cn(
                          "p-4 font-semibold",
                          isToday && "bg-primary/10 text-primary"
                        )}
                      >
                        <div>{format(day, "EEEE", { locale: ptBR })}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {format(day, "dd 'de' MMM", { locale: ptBR })}
                        </div>
                      </td>
                    </tr>
                    {dayAppointments.length > 0 ? (
                      dayAppointments.map((apt) => (
                        <tr
                          key={apt.id}
                          className={cn(
                            "border-b last:border-b-0 cursor-pointer hover:bg-accent transition-colors",
                            apt.status === "completed" && "border-l-4 border-l-green-500",
                            apt.status === "cancelled" && "border-l-4 border-l-red-500 opacity-70"
                          )}
                          onClick={() => handleEdit(apt)}
                        >
                          <td className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-semibold text-sm mb-2">
                                  {apt.appointment_time.slice(0, 5)} - {calculateEndTime(apt.appointment_time, apt.services)}
                                </div>
                                <div className="text-sm mb-1">
                                  {apt.client?.name} - {apt.services?.map((s) => s.name).join(", ")}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {apt.professional?.full_name}
                                </div>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <AppointmentChargeDialog appointmentId={apt.id} />
                                <Button
                                  size="sm"
                                  variant={apt.status === "completed" ? "default" : "outline"}
                                  className={cn(
                                    apt.status === "completed" && "bg-green-600 hover:bg-green-700 text-white",
                                    apt.status !== "completed" && "border-green-500 text-green-700 hover:bg-green-50"
                                  )}
                                  onClick={() => updateStatus.mutate({ id: apt.id, status: "completed" })}
                                  disabled={updateStatus.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Efetivado
                                </Button>
                                <Button
                                  size="sm"
                                  variant={apt.status === "cancelled" ? "destructive" : "outline"}
                                  className={cn(
                                    apt.status !== "cancelled" && "border-red-500 text-red-700 hover:bg-red-50"
                                  )}
                                  onClick={() => updateStatus.mutate({ id: apt.id, status: "cancelled" })}
                                  disabled={updateStatus.isPending}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Cancelado
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b">
                        <td className="p-4 text-sm text-muted-foreground italic">
                          Nenhum agendamento
                        </td>
                      </tr>
                    )}
                    {!isLastDay && (
                      <tr>
                        <td className="p-0">
                          <div className="border-t-2 border-black my-2" />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <AppointmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          onDelete={handleDeleteFromDialog}
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

export default Agenda;
