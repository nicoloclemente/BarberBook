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
      const res = await apiRequest("PUT", `/api/admin/approve-barber/${barberId}`);
      return res.json();
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
                  <div className="text-center text-muted-foreground py-8">
                    <Info className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                    <p>Nessun barbiere trovato nel sistema</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {barbers.map((barber) => (
                      <div key={barber.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {barber.imageUrl ? (
                              <img 
                                src={barber.imageUrl} 
                                alt={barber.name} 
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              barber.name.charAt(0)
                            )}
                          </div>
                          <div className="ml-4">
                            <p className="font-medium">{barber.name}</p>
                            <p className="text-sm text-muted-foreground">{barber.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {barber.isApproved ? (
                            <>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Approvato
                              </Badge>
                              <DeleteAccountDialog userId={barber.id} isAdmin={true} />
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                In attesa
                              </Badge>
                              <Button 
                                size="sm" 
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
                              <DeleteAccountDialog userId={barber.id} isAdmin={true} />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
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
                  <div className="text-center text-muted-foreground py-8">
                    <Info className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                    <p>Nessun cliente trovato nel sistema</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {clients.map((client) => (
                      <div key={client.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                            {client.imageUrl ? (
                              <img 
                                src={client.imageUrl} 
                                alt={client.name} 
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              client.name.charAt(0)
                            )}
                          </div>
                          <div className="ml-4">
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.username}</p>
                            {client.phone && (
                              <p className="text-xs text-muted-foreground mt-1">{client.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Cliente
                          </Badge>
                          <DeleteAccountDialog userId={client.id} isAdmin={true} />
                        </div>
                      </div>
                    ))}
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
                <div className="space-y-4">
                  <div className="flex justify-between px-4 py-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Versione sistema</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Ultimo aggiornamento</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Stato database</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Operativo
                    </Badge>
                  </div>
                  <Button 
                    className="w-full justify-between" 
                    variant="outline" 
                    onClick={() => navigate("/admin/notifications")}
                  >
                    <span className="font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Gestione Notifiche
                    </span>
                    <span>→</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}