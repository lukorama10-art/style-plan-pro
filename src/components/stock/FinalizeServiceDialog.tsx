import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Product } from "@/hooks/useProducts";
import { Appointment } from "@/hooks/useAppointments";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductItem {
  product_id: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  products: Product[];
  onSubmit: (data: {
    appointment_id: string;
    professional_id: string;
    items: ProductItem[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export const FinalizeServiceDialog = ({
  open,
  onOpenChange,
  appointment,
  products,
  onSubmit,
  isLoading,
}: Props) => {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const addItem = (productId: string) => {
    if (items.find((i) => i.product_id === productId)) return;
    setItems([...items, { product_id: productId, quantity: 1 }]);
    setSearchTerm("");
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.product_id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    setItems(items.map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i)));
  };

  const handleSubmit = async () => {
    if (!appointment || items.length === 0) return;
    await onSubmit({
      appointment_id: appointment.id,
      professional_id: appointment.professional_id,
      items,
    });
    setItems([]);
    onOpenChange(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.active &&
      !items.find((i) => i.product_id === p.id) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.slice(0, 8).includes(searchTerm.toLowerCase()))
  );

  const getProduct = (id: string) => products.find((p) => p.id === id);

  const hasStockIssue = items.some((i) => {
    const p = getProduct(i.product_id);
    return p && p.quantity < i.quantity;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Serviço - Dar Baixa no Estoque</DialogTitle>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>Cliente:</strong> {appointment.client?.name}</p>
              <p><strong>Serviços:</strong> {appointment.services?.map((s) => s.name).join(", ")}</p>
              <p><strong>Profissional:</strong> {appointment.professional?.full_name}</p>
            </div>

            <div>
              <Label>Buscar produto para adicionar</Label>
              <Input
                placeholder="Digite o nome ou ID do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
              {searchTerm.length > 0 && filteredProducts.length > 0 && (
                <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                  {filteredProducts.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                      onClick={() => addItem(p.id)}
                    >
                      <span>{p.name}</span>
                      <Badge variant={p.quantity <= p.min_quantity ? "destructive" : "secondary"}>
                        Estoque: {p.quantity}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <Label>Produtos utilizados</Label>
                {items.map((item) => {
                  const product = getProduct(item.product_id);
                  const insufficient = product && product.quantity < item.quantity;
                  return (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{product?.name}</p>
                        <p className="text-muted-foreground">
                          Estoque: {product?.quantity}
                          {insufficient && (
                            <span className="text-destructive ml-2 inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Insuficiente
                            </span>
                          )}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.product_id, parseInt(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || items.length === 0 || hasStockIssue}
              >
                {isLoading ? "Processando..." : "Concluir e Dar Baixa"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
