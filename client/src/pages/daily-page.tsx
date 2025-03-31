import { useQuery } from "@tanstack/react-query";
import { format, parseISO, addMinutes } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { it } from "date-fns/locale";
import { useState } from "react";
import MainLayout from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface AppointmentClient {
  id: number;
  name: string;
}

interface AppointmentService {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface AppointmentResponse {
  id: number;
  clientId: number;
  barberId: number;
  date: string;
  serviceId: number;
  status: string;
  client: AppointmentClient;
  service: AppointmentService;
}

// Interfaccia semplificata per i dati visualizzati
interface Appointment {
  id: number;
  clientId: number;
  barberId: number;
  date: string;
  time: string;
  serviceId: number;
  status: string;
  clientName: string;
  serviceName: string;
  price: number;
  duration: number;
}

// Funzione per convertire il formato della risposta API nel formato atteso dal componente
const mapAppointmentResponse = (appointment: AppointmentResponse): Appointment => {
  const appointmentDate = new Date(appointment.date);
  return {
    id: appointment.id,
    clientId: appointment.clientId,
    barberId: appointment.barberId,
    date: format(appointmentDate, 'yyyy-MM-dd'),
    time: format(appointmentDate, 'HH:mm'),
    serviceId: appointment.serviceId,
    status: appointment.status,
    clientName: appointment.client.name,
    serviceName: appointment.service.name,
    price: appointment.service.price,
    duration: appointment.service.duration
  };
};

export default function DailyPage() {
  const [date, setDate] = useState<Date>(new Date());
  const { user } = useAuth();
  const { toast } = useToast();

  // Query per ottenere gli appuntamenti del giorno selezionato
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments/date', format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
      try {
        const response = await apiRequest<AppointmentResponse[]>("GET", `/api/appointments/date/${format(date, 'yyyy-MM-dd')}`);
        return response.map(mapAppointmentResponse);
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare gli appuntamenti",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Ordina gli appuntamenti per orario
  const sortedAppointments = appointments?.sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda Giornaliera</h1>
            <p className="text-muted-foreground">
              Visualizza e gestisci gli appuntamenti del giorno selezionato
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{format(date, "EEEE d MMMM yyyy", { locale: it })}</CardTitle>
              <CardDescription>
                {sortedAppointments && sortedAppointments.length > 0
                  ? `${sortedAppointments.length} appuntamenti in programma`
                  : "Nessun appuntamento programmato"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : sortedAppointments && sortedAppointments.length > 0 ? (
                <div className="space-y-4">
                  {sortedAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-3 h-full min-h-[2.5rem] rounded-full", 
                          appointment.status === "completed" ? "bg-green-500" :
                          appointment.status === "cancelled" ? "bg-red-500" :
                          appointment.status === "confirmed" ? "bg-blue-500" : "bg-yellow-500"
                        )} />
                        <div>
                          <div className="font-medium flex items-start gap-1">
                            <time className="text-sm font-semibold">
                              {appointment.time.slice(0, 5)}
                            </time>
                            <span className="text-sm text-muted-foreground mx-1">-</span>
                            <time className="text-sm font-semibold">
                              {format(new Date(
                                new Date(`2000-01-01T${appointment.time}`)
                                  .setMinutes(
                                    new Date(`2000-01-01T${appointment.time}`).getMinutes() + appointment.duration
                                  )
                              ), 'HH:mm')}
                            </time>
                          </div>
                          <h4 className="font-medium">{appointment.clientName}</h4>
                          <div className="text-sm text-muted-foreground">{appointment.serviceName}</div>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex gap-2 sm:flex-row items-center">
                        <div className="rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {appointment.duration} min
                        </div>
                        <div className="rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {(appointment.price / 100).toFixed(2)} €
                        </div>
                        <div className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium",
                          appointment.status === "completed" ? "bg-green-100 text-green-800" :
                          appointment.status === "cancelled" ? "bg-red-100 text-red-800" :
                          appointment.status === "confirmed" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                        )}>
                          {appointment.status === "completed" ? "Completato" :
                           appointment.status === "cancelled" ? "Cancellato" :
                           appointment.status === "confirmed" ? "Confermato" : "In attesa"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nessun appuntamento per oggi</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-2">
                    Non ci sono appuntamenti programmati per questa data. Seleziona un'altra data o aggiungi un nuovo appuntamento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}