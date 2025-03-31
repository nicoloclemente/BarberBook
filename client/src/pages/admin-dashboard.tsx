import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import MainLayout from "@/components/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserX, RefreshCw, Info, Bell, Calendar, UserCog } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DeleteAccountDialog from "@/components/account/delete-account-dialog";
import { User } from "@shared/schema";

interface Barber {
  id: number;
  name: string;
  username: string;
  isApproved: boolean;
  role: string;
  imageUrl: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  createdAt: Date;
}

// Componente principale della dashboard amministrativa
export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Verifica che l'utente sia un amministratore
  useEffect(() => {
    if (user && user.role !== "admin") {
      toast({
        title: "Accesso non autorizzato",
        description: "Solo gli amministratori possono accedere a questa pagina",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  // Query per ottenere tutti i barbieri
  const { data: barbers, isLoading: isLoadingBarbers } = useQuery({
    queryKey: ["/api/admin/barbers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/barbers");
      if (!res.ok) {
        throw new Error("Impossibile caricare l'elenco dei barbieri");
      }
      return res.json() as Promise<Barber[]>;
    },
    enabled: !!user && user.role === "admin"
  });
  
  // Query per ottenere tutti i clienti
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/admin/clients"],
    queryFn: async () => {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) {
        throw new Error("Impossibile caricare l'elenco dei clienti");
      }
      return res.json() as Promise<User[]>;
    },
    enabled: !!user && user.role === "admin"
  });

  // Mutation per approvare un barbiere
  const approveMutation = useMutation({
    mutationFn: async (barberId: number) => {
      return apiRequest("PUT", `/api/admin/approve-barber/${barberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/barbers"] });
      toast({
        title: "Barbiere approvato",
        description: "Il barbiere è stato approvato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile approvare il barbiere: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation per rimuovere l'approvazione di un barbiere
  const removeApprovalMutation = useMutation({
    mutationFn: async (barberId: number) => {
      return apiRequest("PUT", `/api/admin/remove-barber-approval/${barberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/barbers"] });
      toast({
        title: "Approvazione rimossa",
        description: "L'approvazione del barbiere è stata rimossa con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile rimuovere l'approvazione del barbiere: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Amministrativa
          </h1>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2"
            >
              <UserCog className="h-4 w-4" />
              Profilo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin/notifications")}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Notifiche
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="barbers">Gestione Barbieri</TabsTrigger>
            <TabsTrigger value="clients">Gestione Clienti</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          {/* Pannello Gestione Barbieri */}
          <TabsContent value="barbers">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Gestione Barbieri</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/barbers"] })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aggiorna
                  </Button>
                </CardTitle>
                <CardDescription>
                  Approva i nuovi barbieri e gestisci gli account esistenti
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBarbers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !barbers || barbers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
                    <p className="text-lg font-medium mb-1">Nessun barbiere trovato</p>
                    <p className="text-sm text-muted-foreground">Non ci sono barbieri registrati nel sistema</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 grid grid-cols-3 font-medium text-sm text-muted-foreground">
                      <div>Barbiere</div>
                      <div className="text-center">Stato</div>
                      <div className="text-right">Azioni</div>
                    </div>
                    <div className="divide-y">
                      {barbers.map((barber) => (
                        <div key={barber.id} className="px-4 py-4 grid grid-cols-3 items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-medium ring-2 ring-background shadow-sm">
                              {barber.imageUrl ? (
                                <img 
                                  src={barber.imageUrl} 
                                  alt={barber.name} 
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                barber.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{barber.name}</p>
                              <p className="text-sm text-muted-foreground">@{barber.username}</p>
                              {barber.phone && (
                                <p className="text-xs text-muted-foreground mt-0.5">{barber.phone}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-center">
                            {barber.isApproved ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Approvato
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                </span>
                                In attesa
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-end gap-2">
                            {barber.isApproved ? (
                              <Button 
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => removeApprovalMutation.mutate(barber.id)} 
                                disabled={removeApprovalMutation.isPending}
                              >
                                {removeApprovalMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Rimuovi Approvazione
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => approveMutation.mutate(barber.id)} 
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Approva
                                  </>
                                )}
                              </Button>
                            )}
                            <DeleteAccountDialog userId={barber.id} isAdmin={true} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pannello Gestione Clienti */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Gestione Clienti</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aggiorna
                  </Button>
                </CardTitle>
                <CardDescription>
                  Visualizza e gestisci gli account dei clienti registrati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingClients ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !clients || clients.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
                    <p className="text-lg font-medium mb-1">Nessun cliente trovato</p>
                    <p className="text-sm text-muted-foreground">Non ci sono clienti registrati nel sistema</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 grid grid-cols-3 font-medium text-sm text-muted-foreground">
                      <div>Cliente</div>
                      <div className="text-center">Info contatto</div>
                      <div className="text-right">Azioni</div>
                    </div>
                    <div className="divide-y">
                      {clients.map((client) => (
                        <div key={client.id} className="px-4 py-4 grid grid-cols-3 items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white text-lg font-medium ring-2 ring-background shadow-sm">
                              {client.imageUrl ? (
                                <img 
                                  src={client.imageUrl} 
                                  alt={client.name} 
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                client.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-muted-foreground">@{client.username}</p>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="relative flex h-2 w-2">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                              Cliente
                            </div>
                            {client.phone && (
                              <p className="text-xs text-muted-foreground mt-2">{client.phone}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-end">
                            <DeleteAccountDialog userId={client.id} isAdmin={true} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* Pannello Sistema */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni di Sistema</CardTitle>
                <CardDescription>
                  Monitora lo stato del sistema e le risorse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 font-medium text-sm">
                        Informazioni di Sistema
                      </div>
                      <div className="divide-y">
                        <div className="flex justify-between items-center px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Versione sistema</span>
                          </div>
                          <div className="px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                            1.0.0
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                              <RefreshCw className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Ultimo aggiornamento</span>
                          </div>
                          <div className="px-3 py-1 rounded-md bg-purple-50 text-purple-700 font-medium">
                            {new Date().toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                              </span>
                            </div>
                            <span className="font-medium">Stato database</span>
                          </div>
                          <div className="px-3 py-1 rounded-md bg-green-50 text-green-700 font-medium border border-green-200">
                            Operativo
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full justify-between h-auto py-3" 
                      variant="outline" 
                      onClick={() => navigate("/admin/notifications")}
                    >
                      <span className="font-medium flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Gestione Notifiche
                      </span>
                      <span className="text-lg">→</span>
                    </Button>
                  </div>
                  
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 font-medium text-sm">
                      Statistiche di Utilizzo
                    </div>
                    <div className="p-5 text-center">
                      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4">
                        <Info className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">Sistema in Esecuzione</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Il sistema è operativo e funzionante.
                      </p>
                      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                        <div className="rounded-md bg-muted/50 p-3">
                          <p className="text-2xl font-bold text-indigo-600">{barbers?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">Barbieri</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-3">
                          <p className="text-2xl font-bold text-purple-600">{clients?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">Clienti</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}