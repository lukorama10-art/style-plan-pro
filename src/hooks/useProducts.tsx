import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  category: string;
  cost_price: number;
  quantity: number;
  min_quantity: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: "entry" | "exit";
  quantity: number;
  appointment_id: string | null;
  professional_id: string | null;
  notes: string | null;
  created_at: string;
  product?: Product;
  professional?: { full_name: string };
}

export const PRODUCT_CATEGORIES = [
  "Cabelo",
  "Unha",
  "Maquiagem",
  "Limpeza",
  "Químicos",
  "Descartáveis",
  "Outros",
];

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["products-low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("quantity");
      if (error) throw error;
      return (data as Product[]).filter((p) => p.quantity <= p.min_quantity);
    },
  });

  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, product:products(name, category), professional:professionals(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: ProductInput) => {
      const { data, error } = await supabase
        .from("products")
        .insert([product] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      toast.success("Produto cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar produto: " + error.message);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...product }: ProductInput & { id: string }) => {
      const { error } = await supabase
        .from("products")
        .update(product)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      toast.success("Produto excluído!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });

  const addStockEntry = useMutation({
    mutationFn: async ({
      product_id,
      quantity,
      notes,
    }: {
      product_id: string;
      quantity: number;
      notes?: string;
    }) => {
      // Insert movement
      const { error: movError } = await supabase
        .from("stock_movements")
        .insert([{ product_id, movement_type: "entry", quantity, notes }] as any);
      if (movError) throw movError;

      // Update product quantity
      const product = products?.find((p) => p.id === product_id);
      if (!product) throw new Error("Produto não encontrado");

      const { error } = await supabase
        .from("products")
        .update({ quantity: product.quantity + quantity })
        .eq("id", product_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Entrada registrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar entrada: " + error.message);
    },
  });

  const addStockExit = useMutation({
    mutationFn: async ({
      product_id,
      quantity,
      notes,
    }: {
      product_id: string;
      quantity: number;
      notes?: string;
    }) => {
      const product = products?.find((p) => p.id === product_id);
      if (!product) throw new Error("Produto não encontrado");
      if (product.quantity < quantity) {
        throw new Error(
          `Estoque insuficiente para "${product.name}". Disponível: ${product.quantity}, Solicitado: ${quantity}`
        );
      }

      const { error: movError } = await supabase
        .from("stock_movements")
        .insert([{ product_id, movement_type: "exit", quantity, notes }] as any);
      if (movError) throw movError;

      const { error } = await supabase
        .from("products")
        .update({ quantity: product.quantity - quantity })
        .eq("id", product_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Saída registrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar saída: " + error.message);
    },
  });

  const registerProductUsage = useMutation({

    mutationFn: async ({
      appointment_id,
      professional_id,
      items,
    }: {
      appointment_id: string;
      professional_id: string;
      items: { product_id: string; quantity: number }[];
    }) => {
      // Validate stock
      for (const item of items) {
        const product = products?.find((p) => p.id === item.product_id);
        if (!product) throw new Error("Produto não encontrado");
        if (product.quantity < item.quantity) {
          throw new Error(
            `Estoque insuficiente para "${product.name}". Disponível: ${product.quantity}, Solicitado: ${item.quantity}`
          );
        }
      }

      // Insert appointment_products and stock_movements, update quantities
      for (const item of items) {
        const { error: apError } = await supabase
          .from("appointment_products")
          .insert([
            {
              appointment_id,
              product_id: item.product_id,
              quantity: item.quantity,
            },
          ] as any);
        if (apError) throw apError;

        const { error: movError } = await supabase
          .from("stock_movements")
          .insert([
            {
              product_id: item.product_id,
              movement_type: "exit",
              quantity: item.quantity,
              appointment_id,
              professional_id,
            },
          ] as any);
        if (movError) throw movError;

        const product = products?.find((p) => p.id === item.product_id);
        if (product) {
          const { error } = await supabase
            .from("products")
            .update({ quantity: product.quantity - item.quantity })
            .eq("id", item.product_id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Serviço finalizado e estoque atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  return {
    products: products || [],
    lowStockProducts: lowStockProducts || [],
    movements: movements || [],
    isLoading,
    loadingMovements,
    createProduct,
    updateProduct,
    deleteProduct,
    addStockEntry,
    addStockExit,
    registerProductUsage,
  };
};
