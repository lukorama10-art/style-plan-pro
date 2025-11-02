import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients, Client } from "@/hooks/useClients";
import ClientDialog from "@/components/clients/ClientDialog";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const { clients, isLoading, createClient, updateClient, deleteClient } =
    useClients(searchTerm);

  const handleSave = async (clientData: any) => {
    if (clientData.id) {
      await updateClient.mutateAsync(clientData);
    } else {
      await createClient.mutateAsync(clientData);
    }
    setDialogOpen(false);
    setSelectedClient(null);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient.mutateAsync(clientToDelete);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie sua base de clientes
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedClient(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clients && clients.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cadastrado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>{client.email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(client.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(client)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(client.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhum cliente encontrado com esse termo de busca"
                    : "Nenhum cliente cadastrado ainda"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={selectedClient}
          onSave={handleSave}
          isSaving={createClient.isPending || updateClient.isPending}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este cliente? Esta ação não pode
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

export default Clients;
