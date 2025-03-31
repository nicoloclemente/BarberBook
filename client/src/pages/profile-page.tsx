import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/main-layout";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserRole } from "@shared/schema";
import { Loader2, Save, UserCog, Calendar, Clock, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WorkingHoursForm from "@/components/schedule/working-hours-form";
import DeleteAccountDialog from "@/components/account/delete-account-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const profileSchema = z.object({
  name: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  phone: z.string().nullable().optional().or(z.literal("")),
  imageUrl: z.string().nullable().optional().or(z.literal("")),
  barberCode: z.string().nullable().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utilizziamo la query per assicurarci di ottenere i dati utente più aggiornati
  const { data: userData, isLoading, isError } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 2, 
    staleTime: 30000
  });

  // Utilizziamo i dati dalla query o quelli dall'hook di autenticazione
  const userInfo = userData || user || undefined;
  
  // Debug logs
  console.log("Profile Page rendering, user:", userInfo ? "User loaded" : "No user", "Loading:", isLoading);
  
  // Creiamo il form all'inizio
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userInfo?.name || "",
      phone: userInfo?.phone || "",
      imageUrl: userInfo?.imageUrl || "",
      barberCode: userInfo?.barberCode || "",
    }
  });

  // Aggiorniamo il form quando l'utente cambia
  useEffect(() => {
    try {
      if (userInfo) {
        form.reset({
          name: userInfo.name || "",
          phone: userInfo.phone || "",
          imageUrl: userInfo.imageUrl || "",
          barberCode: userInfo.barberCode || "",
        });
      }
    } catch (err) {
      console.error("Error resetting form:", err);
      setError("Errore nell'inizializzazione del form");
    }
  }, [userInfo, form]);

  // Aggiungiamo un controllo per lo stato di caricamento
  useEffect(() => {
    if (isLoading) {
      console.log("Loading user data...");
    } else if (isError) {
      console.log("Error loading user data");
      setError("Errore nel caricamento dei dati utente. Ricarica la pagina.");
    } else if (!userInfo) {
      console.log("User not loaded yet");
    } else {
      console.log("User data loaded successfully");
    }
  }, [userInfo, isLoading, isError]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (!userInfo?.id) {
        throw new Error("Utente non disponibile");
      }
      
      console.log("Updating user:", userInfo.id, data);
      return await apiRequest<User>('PATCH', `/api/users/${userInfo.id}`, data);
    },
    onSuccess: (updatedUser: User) => {
      console.log("User updated successfully:", updatedUser);
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: "Profilo aggiornato",
        description: "Le tue informazioni sono state aggiornate con successo.",
      });
      setIsUpdating(false);
      setError(null);
    },
    onError: (error: Error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare il profilo: " + error.message,
        variant: "destructive",
      });
      setIsUpdating(false);
      setError(error.message);
    }
  });

  const onSubmit = (values: ProfileFormValues) => {
    setIsUpdating(true);
    updateProfileMutation.mutate(values);
  };

  // Aggiorniamo per usare userInfo consistentemente
  const isClient = userInfo && !userInfo.isBarber && userInfo.role === UserRole.CLIENT;
  const isBarber = userInfo && (userInfo.isBarber || userInfo.role === UserRole.BARBER);
  const isAdmin = userInfo && userInfo.role === UserRole.ADMIN;

  // Mostriamo un indicatore di caricamento se l'utente non è ancora disponibile
  if (isLoading || !userInfo) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-3 mb-6">
            <UserCog className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">Il Tuo Profilo</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Caricamento delle informazioni in corso...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-3 mb-6">
          <UserCog className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gradient">Il Tuo Profilo</h1>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2 card-elegant">
            <CardHeader>
              <CardTitle>Informazioni Personali</CardTitle>
              <CardDescription>Modifica i tuoi dati personali</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Il tuo nome" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Numero di telefono" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Immagine profilo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="URL della tua immagine profilo" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isClient && (
                    <FormField
                      control={form.control}
                      name="barberCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Codice Barbiere</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Inserisci il codice del tuo barbiere preferito" 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">
                            Chiedi al tuo barbiere di fiducia il suo codice personale per collegare il tuo account.
                          </p>
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {isBarber && (
                    <FormField
                      control={form.control}
                      name="barberCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Il Tuo Codice Barbiere</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Il tuo codice identificativo" 
                                value={field.value || ""}
                              />
                            </FormControl>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Questo è il tuo codice unico. Condividilo con i clienti per permettere loro di selezionarti come loro barbiere.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      className="btn-elegant"
                      disabled={isUpdating || !form.formState.isDirty}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salva Modifiche
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader>
              <CardTitle>Informazioni Account</CardTitle>
              <CardDescription>Dettagli del tuo account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Username</Label>
                <p className="text-neutral-700">{userInfo?.username}</p>
              </div>
              
              <div>
                <Label>Ruolo</Label>
                <p className="text-neutral-700 capitalize">
                  {isClient && "Cliente"}
                  {isBarber && "Barbiere"}
                  {isAdmin && "Amministratore"}
                </p>
              </div>
              
              <div>
                <Label>Stato account</Label>
                <p className="text-neutral-700">
                  {userInfo?.isActive ? (
                    <span className="text-green-600 font-medium">Attivo</span>
                  ) : (
                    <span className="text-red-600 font-medium">Disattivato</span>
                  )}
                </p>
              </div>
              
              {isBarber && (
                <div>
                  <Label>Stato approvazione</Label>
                  <p className="text-neutral-700">
                    {userInfo?.isApproved ? (
                      <span className="text-green-600 font-medium">Approvato</span>
                    ) : (
                      <span className="text-amber-600 font-medium">In attesa di approvazione</span>
                    )}
                  </p>
                </div>
              )}
              
              <div>
                <Label>Data registrazione</Label>
                <p className="text-neutral-700">
                  {userInfo?.createdAt && new Date(userInfo.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>
              </div>
              
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-red-600 mb-1">Zona Pericolo</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Una volta eliminato l'account, tutti i tuoi dati saranno rimossi permanentemente.
                </p>
                <DeleteAccountDialog />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sezione Orari di Lavoro per i Barbieri */}
        {isBarber && userInfo?.isApproved && (
          <div className="mt-8">
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="schedule">
                  <Clock className="h-4 w-4 mr-2" />
                  Orari di Lavoro
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendario
                </TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="mt-4">
                <WorkingHoursForm />
              </TabsContent>
              <TabsContent value="calendar" className="mt-4">
                <div className="rounded-lg border p-8 text-center bg-background">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Visualizzazione del calendario in arrivo</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    La visualizzazione completa del calendario con le tue prenotazioni sarà disponibile a breve.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </MainLayout>
  );
}