import { useState } from "react";
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
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useProfessionals, Professional } from "@/hooks/useProfessionals";
import { ProfessionalDialog } from "@/components/professionals/ProfessionalDialog";
import { formatPhoneNumber } from "@/utils/phoneFormatter";
import { useServices } from "@/hooks/useServices";

const DAYS_MAP: { [key: number]: string } = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

const Professionals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);

  const {
    professionals,
    isLoading,
    createProfessional,
    updateProfessional,
    deleteProfessional,
  } = useProfessionals(searchTerm);

  const { services } = useServices();

  const handleSubmit = async (data: any) => {
    if (selectedProfessional) {
      await updateProfessional.mutateAsync({
        id: selectedProfessional.id,
        ...data,
      });
    } else {
      await createProfessional.mutateAsync(data);
    }
    setDialogOpen(false);
    setSelectedProfessional(null);
  };

  const handleEdit = (professional: Professional) => {
    setSelectedProfessional(professional);
    setDialogOpen(true);
  };

  const handleDelete = (professional: Professional) => {
    setSelectedProfessional(professional);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedProfessional) {
      await deleteProfessional.mutateAsync(selectedProfessional.id);
      setDeleteDialogOpen(false);
      setSelectedProfessional(null);
    }
  };

  const getServiceNames = (serviceIds: string[]) => {
    return serviceIds
      .map((id) => services?.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const renderAvailability = (professional: Professional) => {
    if (!professional.availability || professional.availability.length === 0) {
      return <span className="text-muted-foreground">Não definida</span>;
    }

    return (
      <div className="flex gap-3 flex-wrap">
        {professional.availability.map((avail) => {
          const periods = avail.periods
            .map((p) => (p === "morning" ? "M" : "T"))
            .join("/");
          
          return (
            <div key={avail.day_of_week} className="flex flex-col items-center">
              <span className="text-sm font-medium">{DAYS_MAP[avail.day_of_week]}</span>
              <span className="text-xs text-muted-foreground">{periods}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <Button
            onClick={() => {
              setSelectedProfessional(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Profissional
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar profissionais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Disponibilidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Nenhum profissional cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  professionals?.map((professional) => (
                    <TableRow key={professional.id}>
                      <TableCell className="font-medium">
                        {professional.full_name}
                      </TableCell>
                      <TableCell>
                        {professional.phone
                          ? formatPhoneNumber(professional.phone)
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {getServiceNames(professional.services || [])}
                      </TableCell>
                      <TableCell>
                        {renderAvailability(professional)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(professional)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(professional)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <ProfessionalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          professional={selectedProfessional || undefined}
          isLoading={
            createProfessional.isPending || updateProfessional.isPending
          }
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o profissional{" "}
                <strong>{selectedProfessional?.full_name}</strong>? Esta ação
                não pode ser desfeita.
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

export default Professionals;
