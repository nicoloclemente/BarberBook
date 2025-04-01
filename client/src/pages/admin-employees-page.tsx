import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft,
  Users, 
  Search, 
  UserCog, 
  UserX,
  UserCheck,
  LinkIcon,
  Unlink,
  Loader2
} from "lucide-react";
import { getInitials } from "@/lib/utils";

interface EmployeeWithManager {
  id: number;
  username: string;
  name: string;
  phone: string | null;
  role: string;
  isBarber: boolean;
  imageUrl: string | null;
  isActive: boolean;
  isApproved: boolean | null;
  preferredBarberId: number | null;
  barberCode: string | null;
  description: string | null;
  managerId: number | null;
  isManager: boolean;
  shopId: number | null;
  createdAt: Date;
  manager: {
    id: number;
    name: string;
    username: string;
  } | null;
}

export default function AdminEmployeesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Verifica che l'utente sia un amministratore
  useEffect(() => {
    if (!user) return;
    
    if (user.role !== 'admin') {
      toast({
        title: "Accesso non autorizzato",
        description: "Solo gli amministratori possono accedere a questa pagina",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [user, navigate, toast]);
  
  // Query per ottenere tutti i dipendenti barbieri
  const { 
    data: employeeBarbers = [], 
    isLoading
  } = useQuery<EmployeeWithManager[]>({
    queryKey: ['/api/admin/employee-barbers'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Filtra i dipendenti in base alla ricerca
  const filteredEmployees = searchQuery 
    ? employeeBarbers.filter(
        employee => 
          employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          employee.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (employee.manager?.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : employeeBarbers;
    
  // Query per ottenere tutti i barbieri (per i manager)
  const { 
    data: barbers = [] 
  } = useQuery<any[]>({
    queryKey: ['/api/admin/barbers'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Filtra solo i barbieri che sono manager
  const managerBarbers = barbers.filter(barber => barber.isManager);
  
  // State per il modal di assegnazione manager
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithManager | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  // Mutation per rimuovere un dipendente da un manager
  const queryClient = useQueryClient();
  const removeDependencyMutation = useMutation({
    mutationFn: async (barberId: number) => {
      return apiRequest(
        "DELETE", 
        `/api/admin/barber-dependency/${barberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employee-barbers'] });
      toast({
        title: "Dipendente scollegato",
        description: "Il dipendente è stato scollegato dal manager con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile scollegare il dipendente: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation per assegnare un dipendente a un manager
  const assignDependencyMutation = useMutation({
    mutationFn: async ({ barberId, managerId }: { barberId: number, managerId: number }) => {
      return apiRequest(
        "POST", 
        `/api/admin/barber-dependency`,
        { barberId, managerId }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employee-barbers'] });
      setIsAssignDialogOpen(false);
      setSelectedEmployee(null);
      setSelectedManagerId(null);
      toast({
        title: "Dipendente assegnato",
        description: "Il dipendente è stato assegnato al manager con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile assegnare il dipendente: ${error}`,
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
              onClick={() => navigate("/admin-dashboard")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Torna alla dashboard
            </Button>
            <h1 className="text-3xl font-bold">Barbieri Dipendenti</h1>
            <p className="text-muted-foreground">
              Visualizza e gestisci tutti i barbieri dipendenti nel sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Pannello laterale con filtri e azioni */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Filtri</CardTitle>
                <CardDescription>
                  Filtra e cerca i dipendenti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid w-full gap-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Cerca per nome, username o manager"
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <p className="text-sm font-medium mb-2">Informazioni</p>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      I barbieri dipendenti sono associati a un barbiere manager.
                    </p>
                    <p>
                      I dipendenti utilizzano il codice barber del loro manager per i clienti.
                    </p>
                    <p>
                      I dipendenti hanno accesso limitato al sistema e possono visualizzare solo
                      la loro agenda giornaliera e le loro chat.
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
                <CardTitle>Tutti i Dipendenti</CardTitle>
                <CardDescription>
                  {filteredEmployees.length} barbieri dipendenti trovati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
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
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="border rounded-lg py-12 text-center">
                    <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium mb-1">Nessun dipendente trovato</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {searchQuery 
                        ? "La ricerca non ha trovato alcun dipendente. Prova con un termine diverso."
                        : "Non ci sono ancora barbieri dipendenti nel sistema."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Barbiere</TableHead>
                          <TableHead>Manager</TableHead>
                          <TableHead>Contatto</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
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
                              {employee.manager ? (
                                <div className="flex items-center space-x-2">
                                  <UserCog className="h-4 w-4 text-muted-foreground" />
                                  <span>{employee.manager.name}</span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Nessun manager
                                </Badge>
                              )}
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
                            <TableCell>
                              {employee.isActive ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Attivo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  <UserX className="h-3 w-3 mr-1" />
                                  Inattivo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {employee.manager ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Unlink className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Scollega dipendente</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Sei sicuro di voler scollegare {employee.name} dal manager {employee.manager.name}?
                                        Il dipendente perderà l'accesso agli appuntamenti e ai clienti del manager.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removeDependencyMutation.mutate(employee.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {removeDependencyMutation.isPending && 
                                         removeDependencyMutation.variables === employee.id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Unlink className="h-4 w-4 mr-2" />
                                        )}
                                        Scollega
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setIsAssignDialogOpen(true);
                                  }}
                                >
                                  <LinkIcon className="h-3 w-3" />
                                  Assegna
                                </Button>
                              )}
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
      
      {/* Dialog per l'assegnazione di un manager */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assegna manager al dipendente</DialogTitle>
            <DialogDescription>
              Seleziona un manager per {selectedEmployee?.name}. Il dipendente potrà accedere agli appuntamenti e ai clienti del manager.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <label className="text-sm font-medium">
                Manager disponibili
              </label>
              
              {managerBarbers.length === 0 ? (
                <div className="text-center p-4 border rounded-md">
                  <p className="text-muted-foreground">
                    Non ci sono barbieri manager disponibili.
                    Imposta un barbiere come manager prima di assegnare dipendenti.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {managerBarbers.map((manager) => (
                    <div 
                      key={manager.id}
                      className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedManagerId === manager.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedManagerId(manager.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={manager.imageUrl || undefined} />
                          <AvatarFallback>{getInitials(manager.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{manager.name}</div>
                          <div className="text-xs text-muted-foreground">Codice: {manager.barberCode}</div>
                        </div>
                      </div>
                      
                      {selectedManagerId === manager.id && (
                        <div className="h-4 w-4 rounded-full bg-primary"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedEmployee(null);
                setSelectedManagerId(null);
              }}
            >
              Annulla
            </Button>
            <Button 
              disabled={!selectedManagerId || !selectedEmployee || assignDependencyMutation.isPending}
              onClick={() => {
                if (selectedManagerId && selectedEmployee) {
                  assignDependencyMutation.mutate({
                    barberId: selectedEmployee.id,
                    managerId: selectedManagerId
                  });
                }
              }}
            >
              {assignDependencyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assegnazione...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Assegna dipendente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}