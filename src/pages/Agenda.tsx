import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
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
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [appointmentToFinalize, setAppointmentToFinalize] = useState<Appointment | null>(null);

  const { products, registerProductUsage } = useProducts();

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

  const handleFinalize = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setAppointmentToFinalize(apt);
    setFinalizeDialogOpen(true);
  };

  const handleFinalizeSubmit = async (data: {
    appointment_id: string;
    professional_id: string;
    items: { product_id: string; quantity: number }[];
  }) => {
    await registerProductUsage.mutateAsync(data);
    // Update appointment status to completed
    if (appointmentToFinalize) {
      await updateAppointment.mutateAsync({
        id: appointmentToFinalize.id,
        client_id: appointmentToFinalize.client_id,
        professional_id: appointmentToFinalize.professional_id,
        service_ids: appointmentToFinalize.services?.map((s) => s.id) || [],
        appointment_date: appointmentToFinalize.appointment_date,
        appointment_time: appointmentToFinalize.appointment_time,
      });
    }
    setFinalizeDialogOpen(false);
    setAppointmentToFinalize(null);
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
                          className="border-b last:border-b-0 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleEdit(apt)}
                        >
                          <td className="p-4">
                            <div className="flex items-center justify-between">
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
                              {apt.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-2 shrink-0"
                                  onClick={(e) => handleFinalize(apt, e)}
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Finalizar
                                </Button>
                              )}
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

        <FinalizeServiceDialog
          open={finalizeDialogOpen}
          onOpenChange={setFinalizeDialogOpen}
          appointment={appointmentToFinalize}
          products={products}
          onSubmit={handleFinalizeSubmit}
          isLoading={registerProductUsage.isPending}
        />
      </div>
    </Layout>
  );
};

export default Agenda;
