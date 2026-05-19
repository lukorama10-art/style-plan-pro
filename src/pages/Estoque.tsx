import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, PackagePlus, PackageMinus, Search, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useProducts, Product, PRODUCT_CATEGORIES } from "@/hooks/useProducts";
import { ProductDialog } from "@/components/stock/ProductDialog";
import { StockEntryDialog } from "@/components/stock/StockEntryDialog";
import { StockExitDialog } from "@/components/stock/StockExitDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPrice } from "@/utils/priceFormatter";
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

const Estoque = () => {
  const {
    products,
    lowStockProducts,
    movements,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    addStockEntry,
    addStockExit,
  } = useProducts();

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.slice(0, 8).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalStockValue = products.reduce((sum, p) => sum + p.cost_price * p.quantity, 0);
  const todayExits = movements.filter(
    (m) =>
      m.movement_type === "exit" &&
      format(new Date(m.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;

  const handleProductSubmit = async (data: any) => {
    if (selectedProduct) {
      await updateProduct.mutateAsync({ id: selectedProduct.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }
    setProductDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleEntrySubmit = async (data: any) => {
    await addStockEntry.mutateAsync(data);
    setEntryDialogOpen(false);
  };

  const handleExitSubmit = async (data: any) => {
    await addStockExit.mutateAsync(data);
    setExitDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (selectedProduct) {
      await deleteProduct.mutateAsync(selectedProduct.id);
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Estoque</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEntryDialogOpen(true)}
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              Registrar Entrada
            </Button>
            <Button
              variant="outline"
              onClick={() => setExitDialogOpen(true)}
            >
              <PackageMinus className="mr-2 h-4 w-4" />
              Registrar Saída
            </Button>
            <Button
              onClick={() => {
                setSelectedProduct(null);
                setProductDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total em Estoque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalStockValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Estoque Baixo
                {lowStockProducts.length > 0 && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {lowStockProducts.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço Custo</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const isLow = product.quantity <= product.min_quantity;
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {product.name}
                              {isLow && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(product.cost_price)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={isLow ? "destructive" : "default"}>
                              {product.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{product.min_quantity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setProductDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="movements">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">
                          {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{m.product?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={m.movement_type === "entry" ? "default" : "secondary"}>
                            {m.movement_type === "entry" ? "Entrada" : "Saída"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{m.quantity}</TableCell>
                        <TableCell>{m.professional?.full_name || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <ProductDialog
          open={productDialogOpen}
          onOpenChange={setProductDialogOpen}
          onSubmit={handleProductSubmit}
          product={selectedProduct || undefined}
          isLoading={createProduct.isPending || updateProduct.isPending}
        />

        <StockEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          onSubmit={handleEntrySubmit}
          products={products}
          isLoading={addStockEntry.isPending}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o produto "{selectedProduct?.name}"?
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

export default Estoque;
