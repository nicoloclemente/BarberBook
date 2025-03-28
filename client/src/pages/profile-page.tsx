import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/main-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserRole } from "@shared/schema";
import { Loader2, Save, UserCog, Calendar, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WorkingHoursForm from "@/components/schedule/working-hours-form";

const profileSchema = z.object({
  name: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  phone: z.string().nullable().optional().or(z.literal("")),
  imageUrl: z.string().nullable().optional().or(z.literal("")),
  preferredBarberId: z.number().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      imageUrl: user?.imageUrl || "",
      preferredBarberId: user?.preferredBarberId || null,
    }
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        phone: user.phone || "",
        imageUrl: user.imageUrl || "",
        preferredBarberId: user.preferredBarberId || null,
      });
    }
  }, [user, form]);

  const { data: barbers, isLoading: isLoadingBarbers } = useQuery({
    queryKey: ['/api/barbers'],
    enabled: user?.role === UserRole.CLIENT
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest('PATCH', `/api/users/${user?.id}`, data);
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: "Profilo aggiornato",
        description: "Le tue informazioni sono state aggiornate con successo.",
      });
      setIsUpdating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare il profilo: " + error.message,
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  });

  const onSubmit = (values: ProfileFormValues) => {
    setIsUpdating(true);
    updateProfileMutation.mutate(values);
  };

  const isClient = user && !user.isBarber && user.role === UserRole.CLIENT;
  const isBarber = user && (user.isBarber || user.role === UserRole.BARBER);
  const isAdmin = user && user.role === UserRole.ADMIN;

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-3 mb-6">
          <UserCog className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gradient">Il Tuo Profilo</h1>
        </div>

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
                          <Input {...field} placeholder="Il tuo nome" />
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
                          <Input {...field} placeholder="Numero di telefono" />
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
                          <Input {...field} placeholder="URL della tua immagine profilo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isClient && (
                    <FormField
                      control={form.control}
                      name="preferredBarberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barbiere Preferito</FormLabel>
                          <Select
                            disabled={isLoadingBarbers}
                            value={field.value ? field.value.toString() : ""} 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona il tuo barbiere" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingBarbers ? (
                                <SelectItem value="">Caricamento barbieri...</SelectItem>
                              ) : (
                                <>
                                  <SelectItem value="">Nessun barbiere preferito</SelectItem>
                                  {barbers?.map((barber: User) => (
                                    <SelectItem key={barber.id} value={barber.id.toString()}>
                                      {barber.name}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
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
                <p className="text-neutral-700">{user?.username}</p>
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
                  {user?.isActive ? (
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
                    {user?.isApproved ? (
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
                  {user?.createdAt && new Date(user.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sezione Orari di Lavoro per i Barbieri */}
        {isBarber && user?.isApproved && (
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