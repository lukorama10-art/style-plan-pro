import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { useProfessionals } from "@/hooks/useProfessionals";
import { Appointment } from "@/hooks/useAppointments";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  appointment?: Appointment;
  isLoading: boolean;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  onSubmit,
  appointment,
  isLoading,
}: AppointmentDialogProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm();
  const { clients } = useClients();
  const { services } = useServices();
  const { professionals } = useProfessionals();

  const selectedServiceId = watch("service_id");
  const selectedProfessionalId = watch("professional_id");
  const selectedDate = watch("appointment_date");

  // Filter services based on selected professional
  const availableServices = selectedProfessionalId
    ? services?.filter((service) => {
        const professional = professionals?.find(
          (p) => p.id === selectedProfessionalId
        );
        return professional?.services?.includes(service.id);
      })
    : services;

  useEffect(() => {
    if (appointment) {
      setValue("client_id", appointment.client_id);
      setValue("professional_id", appointment.professional_id);
      setValue("service_id", appointment.service_id);
      setValue("appointment_date", appointment.appointment_date);
      setValue("appointment_time", appointment.appointment_time);
      setValue("notes", appointment.notes || "");
    } else {
      reset();
    }
  }, [appointment, setValue, reset]);

  const selectedService = services?.find((s) => s.id === selectedServiceId);
  const totalDuration = selectedService?.duration || 0;

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                onValueChange={(value) => setValue("client_id", value)}
                defaultValue={appointment?.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="professional_id">Profissional *</Label>
              <Select
                onValueChange={(value) => setValue("professional_id", value)}
                defaultValue={appointment?.professional_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals?.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_id">Serviço *</Label>
            <Select
              onValueChange={(value) => setValue("service_id", value)}
              defaultValue={appointment?.service_id}
              disabled={!selectedProfessionalId}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    selectedProfessionalId 
                      ? "Selecione o serviço" 
                      : "Selecione um profissional primeiro"
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {availableServices?.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {service.duration}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {totalDuration > 0 && (
              <p className="text-sm text-muted-foreground">
                Duração total: {totalDuration} minutos
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(new Date(selectedDate), "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate ? new Date(selectedDate) : undefined}
                    onSelect={(date) =>
                      setValue("appointment_date", date ? format(date, "yyyy-MM-dd") : "")
                    }
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_time">Horário *</Label>
              <Input
                id="appointment_time"
                type="time"
                {...register("appointment_time", { required: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações adicionais..."
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {appointment ? "Atualizar" : "Agendar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
