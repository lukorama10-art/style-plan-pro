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
import { Client, ClientInput } from "@/hooks/useClients";
import { Loader2 } from "lucide-react";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (client: ClientInput & { id?: string }) => void;
  isSaving: boolean;
}

const ClientDialog = ({
  open,
  onOpenChange,
  client,
  onSave,
  isSaving,
}: ClientDialogProps) => {
  const [formData, setFormData] = useState<ClientInput>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email || "",
        phone: client.phone,
        notes: client.notes || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        notes: "",
      });
    }
  }, [client, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (client) {
      onSave({ ...formData, id: client.id });
    } else {
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {client ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {client
              ? "Atualize as informações do cliente"
              : "Preencha os dados do novo cliente"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
                required
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="cliente@exemplo.com"
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Informações adicionais sobre o cliente"
                rows={3}
                disabled={isSaving}
              />
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

export default ClientDialog;
