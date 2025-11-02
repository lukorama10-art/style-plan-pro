import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
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

  const totalDuration = selectedServiceIds.reduce((acc, serviceId) => {
    const service = services?.find((s) => s.id === serviceId);
    return acc + (service?.duration || 0);
  }, 0);

  useEffect(() => {
    if (appointment) {
      setValue("client_id", appointment.client_id);
      setValue("professional_id", appointment.professional_id);
      setSelectedServiceIds(appointment.services?.map((s) => s.id) || []);
      setValue("appointment_date", appointment.appointment_date);
      setValue("appointment_time", appointment.appointment_time);
      setValue("notes", appointment.notes || "");
    } else {
      reset();
      setSelectedServiceIds([]);
    }
  }, [appointment, setValue, reset]);

  const handleFormSubmit = async (data: any) => {
    await onSubmit({ ...data, service_ids: selectedServiceIds });
    reset();
    setSelectedServiceIds([]);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
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
            <Label>Serviços *</Label>
            {!selectedProfessionalId ? (
              <p className="text-sm text-muted-foreground">
                Selecione um profissional primeiro
              </p>
            ) : (
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {availableServices?.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.id}
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <Label
                      htmlFor={service.id}
                      className="font-normal cursor-pointer flex-1"
                    >
                      {service.name} - {service.duration}min
                    </Label>
                  </div>
                ))}
              </div>
            )}
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
              <Label htmlFor="appointment_time">Horário (24h) *</Label>
              <Input
                id="appointment_time"
                type="text"
                placeholder="14:30"
                maxLength={5}
                {...register("appointment_time", { 
                  required: true,
                  pattern: {
                    value: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                    message: "Formato inválido. Use HH:MM (ex: 14:30)"
                  }
                })}
                onInput={(e) => {
                  let value = e.currentTarget.value.replace(/[^\d:]/g, '');
                  
                  // Auto-format as user types
                  if (value.length === 2 && !value.includes(':')) {
                    value = value + ':';
                  }
                  
                  e.currentTarget.value = value;
                }}
              />
              <p className="text-xs text-muted-foreground">Formato: HH:MM (ex: 14:30)</p>
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
