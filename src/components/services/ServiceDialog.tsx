import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Service, ServiceInput } from "@/hooks/useServices";
import { Loader2 } from "lucide-react";
import { formatPriceInput, parsePrice } from "@/utils/priceFormatter";
import { toast } from "sonner";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSave: (service: ServiceInput & { id?: string }) => void;
  isSaving: boolean;
}

const ServiceDialog = ({
  open,
  onOpenChange,
  service,
  onSave,
  isSaving,
}: ServiceDialogProps) => {
  const [formData, setFormData] = useState<ServiceInput>({
    name: "",
    description: "",
    duration: 60,
    price: 0,
    active: true,
  });
  const [priceDisplay, setPriceDisplay] = useState("");

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || "",
        duration: service.duration,
        price: service.price,
        active: service.active,
      });
      setPriceDisplay(formatPriceInput((service.price * 100).toString()));
    } else {
      setFormData({
        name: "",
        description: "",
        duration: 60,
        price: 0,
        active: true,
      });
      setPriceDisplay("");
    }
  }, [service, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.duration <= 0) {
      toast.error("Duração deve ser maior que zero");
      return;
    }

    if (formData.price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }

    if (service) {
      onSave({ ...formData, id: service.id });
    } else {
      onSave(formData);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPriceInput(e.target.value);
    setPriceDisplay(formatted);
    setFormData({ ...formData, price: parsePrice(formatted) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {service ? "Editar Serviço" : "Novo Serviço"}
          </DialogTitle>
          <DialogDescription>
            {service
              ? "Atualize as informações do serviço"
              : "Preencha os dados do novo serviço"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Serviço *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Corte de Cabelo"
                required
                disabled={isSaving}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duração (minutos) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  min="1"
                  required
                  disabled={isSaving}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  value={priceDisplay}
                  onChange={handlePriceChange}
                  placeholder="0,00"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrição do serviço"
                rows={3}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, active: checked })
                }
                disabled={isSaving}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Serviço ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDialog;
