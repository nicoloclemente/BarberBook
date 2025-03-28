import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Service, InsertService } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/main-layout";
import ServiceCard from "@/components/service/service-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const serviceSchema = z.object({
  name: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  description: z.string().optional(),
  price: z.number().min(1, "Il prezzo deve essere almeno 1"),
  duration: z.number().min(5, "La durata deve essere almeno 5 minuti"),
  imageUrl: z.string().url("Inserire un URL valido").optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function ServicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration: 30,
      imageUrl: "",
    },
  });

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const createServiceMutation = useMutation({
    mutationFn: async (service: InsertService) => {
      const res = await apiRequest("POST", "/api/services", service);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Servizio creato",
        description: "Il servizio è stato creato con successo",
      });
      setIsModalOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, service }: { id: number; service: Partial<InsertService> }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, service);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Servizio aggiornato",
        description: "Il servizio è stato aggiornato con successo",
      });
      setIsModalOpen(false);
      setEditingService(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Servizio eliminato",
        description: "Il servizio è stato eliminato con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ServiceFormValues) => {
    // Convert price from euros to cents for storage
    const serviceData = {
      ...values,
      price: values.price * 100,
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, service: serviceData });
    } else {
      createServiceMutation.mutate(serviceData as InsertService);
    }
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      // Convert price from cents to euros for display
      price: service.price / 100,
      duration: service.duration,
      imageUrl: service.imageUrl || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteService = (service: Service) => {
    if (window.confirm(`Sei sicuro di voler eliminare il servizio "${service.name}"?`)) {
      deleteServiceMutation.mutate(service.id);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-primary">Servizi e Listino Prezzi</h2>
            {user?.isBarber && (
              <Button 
                onClick={() => {
                  form.reset({
                    name: "",
                    description: "",
                    price: 0,
                    duration: 30,
                    imageUrl: "",
                  });
                  setEditingService(null);
                  setIsModalOpen(true);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Aggiungi servizio
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : services.length > 0 ? (
              services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  canEdit={user?.isBarber || false}
                  onEdit={() => openEditModal(service)}
                  onDelete={() => handleDeleteService(service)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">Nessun servizio disponibile</p>
                {user?.isBarber && (
                  <Button onClick={() => setIsModalOpen(true)}>
                    Aggiungi il primo servizio
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Modifica servizio" : "Aggiungi nuovo servizio"}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dettagli del servizio che offri nel tuo salone.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome del servizio</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Taglio Capelli" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Es. Taglio classico con forbici e rifinitura con rasoio."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata (minuti)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="5" 
                          step="5"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Immagine (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://esempio.com/immagine.jpg" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsModalOpen(false);
                    form.reset();
                    setEditingService(null);
                  }}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                >
                  {(createServiceMutation.isPending || updateServiceMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingService ? "Aggiorna" : "Salva"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
