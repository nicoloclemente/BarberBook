import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import MainLayout from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserPlus, 
  Users, 
  UserCheck, 
  Trash2, 
  Search, 
  ChevronLeft,
  Loader2, 
  CheckCircle2, 
  UserCog
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";

interface AddEmployeeDialogProps {
  managerId: number;
  onSuccess: () => void;
}

// Componente per il dialog di aggiunta di un nuovo dipendente
function AddEmployeeDialog({ managerId, onSuccess }: AddEmployeeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per cercare i barbieri disponibili
  const { data: barbers = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/barbers', searchQuery],
    queryFn: async () => {
      // API per cercare i barbieri (paginata)
      const response = await fetch(`/api/barbers?search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Errore nel caricamento dei barbieri');
      return response.json();
    },
    enabled: isOpen && searchQuery.length > 2, // Esegui solo se dialog aperto e almeno 3 caratteri
  });

  // Filtra i barbieri per mostrare solo quelli disponibili (senza un manager)
  const availableBarbers = barbers.filter(barber => 
    barber.isBarber && 
    !barber.managerId && 
    barber.id !== managerId && 
    barber.isApproved
  );

  // Mutation per assegnare un barbiere come dipendente
  const assignBarberMutation = useMutation({
    mutationFn: async (barberId: number) => {
      return apiRequest(
        "POST", 
        `/api/barbers/${managerId}/employees/${barberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/barbers/${managerId}/employees`] });
      toast({
        title: "Dipendente aggiunto",
        description: "Il barbiere è stato aggiunto come dipendente",
      });
      setIsOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiungere il dipendente: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Gestisce la selezione e l'aggiunta di un barbiere
  const handleAddEmployee = () => {
    if (selectedBarber) {
      assignBarberMutation.mutate(selectedBarber.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Aggiungi Dipendente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aggiungi un nuovo dipendente</DialogTitle>
          <DialogDescription>
            Cerca e seleziona un barbiere da aggiungere come dipendente
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid w-full gap-2">
            <Label htmlFor="search">Cerca barbiere</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                className="pl-8"
                type="search"
                placeholder="Cerca per nome o username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Inserisci almeno 3 caratteri per iniziare la ricerca
            </p>
          </div>
          
          <Separator />
          
          <div className="rounded-md border h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : availableBarbers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {searchQuery.length < 3
                    ? "Inserisci almeno 3 caratteri per cercare"
                    : "Nessun barbiere disponibile trovato"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {availableBarbers.map((barber) => (
                  <div
                    key={barber.id}
                    className={`flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer ${
                      selectedBarber?.id === barber.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedBarber(barber)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={barber.imageUrl || undefined} />
                        <AvatarFallback>{getInitials(barber.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{barber.name}</div>
                        <div className="text-xs text-muted-foreground">@{barber.username}</div>
                      </div>
                    </div>
                    {selectedBarber?.id === barber.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleAddEmployee} 
            disabled={!selectedBarber || assignBarberMutation.isPending}
          >
            {assignBarberMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aggiunta in corso...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Aggiungi Dipendente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Pagina principale per la gestione dei dipendenti
export default function EmployeeManagementPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Verifica che l'utente sia un barbiere con diritti di manager
  useEffect(() => {
    if (!user) return;
    
    if (!user.isBarber) {
      toast({
        title: "Accesso non autorizzato",
        description: "Solo i barbieri possono accedere a questa pagina",
        variant: "destructive"
      });
      navigate("/");
      return;
    }
    
    if (!user.isManager) {
      toast({
        title: "Funzionalità non disponibile",
        description: "Devi essere un manager per gestire i dipendenti",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [user, navigate, toast]);
  
  // Query per ottenere i dipendenti del barbiere manager
  const { data: employees = [], isLoading: isLoadingEmployees, refetch } = useQuery<User[]>({
    queryKey: [`/api/barbers/${user?.id}/employees`],
    enabled: !!user?.id && !!user?.isManager,
  });

  // Mutation per rimuovere un dipendente
  const removeEmployeeMutation = useMutation({
    mutationFn: async (barberId: number) => {
      return apiRequest(
        "DELETE", 
        `/api/barbers/${user?.id}/employees/${barberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/barbers/${user?.id}/employees`] });
      toast({
        title: "Dipendente rimosso",
        description: "Il dipendente è stato rimosso con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile rimuovere il dipendente: ${error}`,
        variant: "destructive",
      });
    },
  });

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Button
              variant="ghost"
              className="mb-2"
              onClick={() => navigate("/dashboard")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Torna alla dashboard
            </Button>
            <h1 className="text-3xl font-bold">Gestione Dipendenti</h1>
            <p className="text-muted-foreground">
              Gestisci i barbieri che lavorano come tuoi dipendenti
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Pannello laterale con azioni */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Gestione</CardTitle>
                <CardDescription>
                  Aggiungi e gestisci i tuoi dipendenti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AddEmployeeDialog managerId={user?.id || 0} onSuccess={refetch} />
                
                <div className="pt-2">
                  <p className="text-sm font-medium mb-1">Informazioni</p>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-1">
                      I tuoi dipendenti possono essere assegnati ai servizi che offri.
                    </p>
                    <p>
                      Ogni dipendente può gestire appuntamenti e clienti assegnati.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista dipendenti */}
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>I tuoi dipendenti</CardTitle>
                <CardDescription>
                  Barbieri che lavorano come tuoi dipendenti
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingEmployees ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24 mt-1" />
                          </div>
                        </div>
                        <Skeleton className="h-10 w-10 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : employees.length === 0 ? (
                  <div className="border rounded-lg py-12 text-center">
                    <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium mb-1">Nessun dipendente</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Non hai ancora nessun dipendente. Usa il pulsante "Aggiungi Dipendente" per iniziare a costruire il tuo team.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Barbiere</TableHead>
                          <TableHead>Contatto</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage src={employee.imageUrl || undefined} />
                                  <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-xs text-muted-foreground">@{employee.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {employee.phone ? (
                                  <span>{employee.phone}</span>
                                ) : (
                                  <span className="text-muted-foreground">Nessun contatto</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rimuovi dipendente</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Sei sicuro di voler rimuovere {employee.name} dai tuoi dipendenti? 
                                      Questa azione non può essere annullata.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeEmployeeMutation.mutate(employee.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {removeEmployeeMutation.isPending && 
                                       removeEmployeeMutation.variables === employee.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                      )}
                                      Rimuovi
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}