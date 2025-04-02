import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { insertAppointmentSchema, User, Service } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

// Create schema for the form
const appointmentFormSchema = z.object({
  clientId: z.string().min(1, "Il cliente è obbligatorio"),
  barberId: z.string().min(1, "Il barbiere è obbligatorio"),
  serviceId: z.string().min(1, "Il servizio è obbligatorio"),
  date: z.date({ required_error: "La data è obbligatoria" }),
  time: z.string().min(1, "L'orario è obbligatorio"),
  notes: z.string().optional(),
  walkIn: z.boolean().default(false),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function NewAppointmentModal({
  isOpen,
  onClose,
  selectedDate,
}: NewAppointmentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", 
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
  ]);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: "",
      barberId: user?.isBarber ? user.id.toString() : "",
      serviceId: "",
      date: selectedDate,
      time: "",
      notes: "",
      walkIn: false,
    },
  });

  // Reset form when modal opens or selected date changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        ...form.getValues(),
        date: selectedDate,
      });
    }
  }, [isOpen, selectedDate, form]);

  // When date changes, update the time slots
  useEffect(() => {
    const date = form.getValues().date;
    // In a real app, fetch available time slots based on date
    // For now, we'll use a static list
  }, [form.watch("date")]);

  // Fetch clients
  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ['/api/clients'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isOpen && !!user?.isBarber,
  });

  // Fetch barbers if user is not a barber
  const { data: barbers = [] } = useQuery<User[]>({
    queryKey: ['/api/barbers'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isOpen && !user?.isBarber,
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isOpen,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      // apiRequest già ritorna i dati JSON parsificati, non c'è bisogno di chiamare res.json()
      return apiRequest("POST", "/api/appointments", data);
    },
    onSuccess: () => {
      toast({
        title: "Appuntamento creato",
        description: "L'appuntamento è stato creato con successo",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date'] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AppointmentFormValues) => {
    try {
      // Combine date and time into a single Date object
      const [hours, minutes] = values.time.split(":").map(Number);
      const appointmentDate = new Date(values.date);
      appointmentDate.setHours(hours, minutes, 0, 0);

      // Assicuriamoci che la data sia una data valida e che non sia NaN
      if (isNaN(appointmentDate.getTime())) {
        throw new Error("Data o orario non validi");
      }

      // Convert string IDs to numbers
      const data = {
        clientId: parseInt(values.clientId),
        barberId: parseInt(values.barberId),
        serviceId: parseInt(values.serviceId),
        date: appointmentDate, // Invia l'oggetto Date direttamente
        status: user?.isBarber ? "confirmed" : "pending",
        notes: values.notes || null,
        walkIn: values.walkIn || false,
      };

      console.log("Submitting appointment data:", data);
      createAppointmentMutation.mutate(data);
    } catch (error) {
      console.error("Error submitting appointment:", error);
      toast({
        title: "Errore nella creazione dell'appuntamento",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo appuntamento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {user?.isBarber ? (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="barberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barbiere</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona barbiere" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {barbers.map((barber) => (
                          <SelectItem key={barber.id} value={barber.id.toString()}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servizio</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona servizio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} (€{(service.price / 100).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Scegli una data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => 
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orario</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona orario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Inserisci eventuali note o richieste specifiche"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {user?.isBarber && (
              <FormField
                control={form.control}
                name="walkIn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Cliente walk-in</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Cliente senza prenotazione online
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createAppointmentMutation.isPending}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salva appuntamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
