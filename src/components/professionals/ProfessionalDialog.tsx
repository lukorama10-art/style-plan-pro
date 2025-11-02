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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Professional, ProfessionalInput } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { formatPhoneNumber, unformatPhoneNumber } from "@/utils/phoneFormatter";

interface ProfessionalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProfessionalInput) => void;
  professional?: Professional;
  isLoading: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export const ProfessionalDialog = ({
  open,
  onOpenChange,
  onSubmit,
  professional,
  isLoading,
}: ProfessionalDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm<ProfessionalInput>();
  const { services } = useServices();
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availability, setAvailability] = useState<
    { day: number; periods: string[] }[]
  >([]);

  const phoneValue = watch("phone");

  useEffect(() => {
    if (open && professional) {
      reset({
        full_name: professional.full_name,
        phone: professional.phone || "",
      });
      setSelectedServices(professional.services || []);
      setAvailability(
        professional.availability?.map((a) => ({
          day: a.day_of_week,
          periods: a.periods,
        })) || []
      );
    } else if (open) {
      reset({ full_name: "", phone: "" });
      setSelectedServices([]);
      setAvailability([]);
    }
  }, [open, professional, reset]);

  useEffect(() => {
    if (phoneValue) {
      const formatted = formatPhoneNumber(phoneValue);
      if (formatted !== phoneValue) {
        setValue("phone", formatted);
      }
    }
  }, [phoneValue, setValue]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleDayPeriodToggle = (day: number, period: string) => {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.day === day);
      
      if (existing) {
        const newPeriods = existing.periods.includes(period)
          ? existing.periods.filter((p) => p !== period)
          : [...existing.periods, period];
        
        if (newPeriods.length === 0) {
          return prev.filter((a) => a.day !== day);
        }
        
        return prev.map((a) =>
          a.day === day ? { ...a, periods: newPeriods } : a
        );
      } else {
        return [...prev, { day, periods: [period] }];
      }
    });
  };

  const isPeriodSelected = (day: number, period: string) => {
    return availability.some(
      (a) => a.day === day && a.periods.includes(period)
    );
  };

  const handleFormSubmit = (data: ProfessionalInput) => {
    const formattedData = {
      ...data,
      phone: data.phone ? unformatPhoneNumber(data.phone) : undefined,
      services: selectedServices,
      availability: availability.map((a) => ({
        day_of_week: a.day,
        periods: a.periods,
      })),
    };
    onSubmit(formattedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {professional ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: true })}
                placeholder="Nome do profissional"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div>
              <Label>Serviços que pode executar</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                {services?.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => handleServiceToggle(service.id)}
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {service.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Disponibilidade</Label>
              <div className="border rounded-md p-4 space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center gap-4">
                    <span className="text-sm w-20">{day.label}</span>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${day.value}-morning`}
                          checked={isPeriodSelected(day.value, "morning")}
                          onCheckedChange={() =>
                            handleDayPeriodToggle(day.value, "morning")
                          }
                        />
                        <label
                          htmlFor={`${day.value}-morning`}
                          className="text-sm cursor-pointer"
                        >
                          Manhã (08:00-12:00)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${day.value}-afternoon`}
                          checked={isPeriodSelected(day.value, "afternoon")}
                          onCheckedChange={() =>
                            handleDayPeriodToggle(day.value, "afternoon")
                          }
                        />
                        <label
                          htmlFor={`${day.value}-afternoon`}
                          className="text-sm cursor-pointer"
                        >
                          Tarde (13:00-18:00)
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {professional ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
