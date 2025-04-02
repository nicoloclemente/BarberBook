import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addMinutes } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle } from "lucide-react";
import { it } from "date-fns/locale";
import { useState, useEffect, useRef, useMemo } from "react";
import MainLayout from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import NewAppointmentModal from "@/components/appointment/new-appointment-modal";

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
  try {
    // Gestione sicura della data
    let appointmentDate: Date;
    try {
      appointmentDate = new Date(appointment.date);
      // Verifica che la data sia valida
      if (isNaN(appointmentDate.getTime())) {
        console.warn("Data appuntamento non valida:", appointment.date);
        appointmentDate = new Date(); // Fallback alla data corrente
      }
    } catch (e) {
      console.error("Errore nel parsing della data:", e);
      appointmentDate = new Date(); // Fallback alla data corrente
    }
    
    // Verifica e sanitizza i valori
    const formattedDate = format(appointmentDate, 'yyyy-MM-dd');
    const formattedTime = format(appointmentDate, 'HH:mm');
    
    // Gestione sicura dei valori dell'oggetto client
    const client = appointment.client || { id: 0, name: "Cliente non specificato" };
    
    // Gestione sicura dei valori dell'oggetto service
    const service = appointment.service || { 
      id: 0, 
      name: "Servizio non specificato", 
      price: 0, 
      duration: 0 
    };

    return {
      id: typeof appointment.id === 'number' ? appointment.id : 0,
      clientId: typeof appointment.clientId === 'number' ? appointment.clientId : 0,
      barberId: typeof appointment.barberId === 'number' ? appointment.barberId : 0,
      date: formattedDate,
      time: formattedTime,
      serviceId: typeof appointment.serviceId === 'number' ? appointment.serviceId : 0,
      status: typeof appointment.status === 'string' ? appointment.status : "pending",
      clientName: typeof client.name === 'string' ? client.name : "Cliente non specificato",
      serviceName: typeof service.name === 'string' ? service.name : "Servizio non specificato",
      price: typeof service.price === 'number' ? service.price : 0,
      duration: typeof service.duration === 'number' ? service.duration : 0
    };
  } catch (error) {
    console.error("Errore durante la conversione dell'appuntamento:", error);
    // Ritorna un appuntamento di fallback sicuro
    return {
      id: 0,
      clientId: 0,
      barberId: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      serviceId: 0,
      status: "pending",
      clientName: "Cliente non disponibile",
      serviceName: "Servizio non disponibile",
      price: 0,
      duration: 0
    };
  }
};

export default function DailyPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Riferimento per tracciare se è il primo render
  const initialRenderRef = useRef(true);
  
  // Funzione diretta per caricare gli appuntamenti dalla API senza passare per React Query
  // Questo è un approccio più aggressivo per assicurarsi che i dati siano caricati
  const [directAppointments, setDirectAppointments] = useState<Appointment[]>([]);
  
  const loadAppointmentsDirectly = async () => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log("DIRECT LOADING: Fetching appointments for date:", formattedDate);
      
      const response = await apiRequest<AppointmentResponse[]>("GET", `/api/appointments/date/${formattedDate}`);
      console.log("DIRECT LOADING: API Response:", response);
      
      if (!response || !Array.isArray(response)) {
        console.warn("DIRECT LOADING: Risposta non valida:", response);
        return;
      }
      
      const validAppointments = response.filter(a => a && typeof a === 'object' && a.id);
      console.log("DIRECT LOADING: Valid appointments count:", validAppointments.length);
      
      if (validAppointments.length > 0) {
        const mapped = validAppointments.map(mapAppointmentResponse);
        console.log("DIRECT LOADING: Mapped appointments:", mapped);
        setDirectAppointments(mapped);
      }
    } catch (error) {
      console.error("DIRECT LOADING: Errore nel caricamento diretto:", error);
    }
  };
  
  // Effetto per il caricamento diretto iniziale e per il listener WebSocket
  useEffect(() => {
    console.log("DailyPage mounted - Starting direct loading");
    
    // Carica direttamente sulla prima renderizzazione
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      loadAppointmentsDirectly();
    }
    
    // Forza un aggiornamento immediato di tutte le query relative agli appuntamenti
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    
    // Forza un re-fetch specifico per questa data
    const currentDateStr = format(date, 'yyyy-MM-dd');
    queryClient.refetchQueries({ queryKey: ['/api/appointments/date', currentDateStr] });
    
    // Aggiungi un listener per gli eventi di appuntamento
    const handleAppointmentUpdate = () => {
      console.log("Received appointment update event in DailyPage");
      
      // Carica direttamente sulla ricezione di un evento
      loadAppointmentsDirectly();
      
      // Invalidazione aggressiva della cache
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/month'] });
      
      // Forza un refetch specifico per la data corrente
      const dateStr = format(date, 'yyyy-MM-dd');
      queryClient.refetchQueries({ queryKey: ['/api/appointments/date', dateStr] });
    };
    
    addEventListener('appointment', handleAppointmentUpdate);
    
    return () => {
      removeEventListener('appointment', handleAppointmentUpdate);
    };
  }, [queryClient, date]);
  
  // Effetto aggiuntivo per ricaricare i dati quando cambia la data
  useEffect(() => {
    loadAppointmentsDirectly();
  }, [date]);

  // Query per ottenere gli appuntamenti del giorno selezionato (backup)
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['/api/appointments/date', formattedDate],
    queryFn: async () => {
      try {
        console.log("Fetching appointments for date via React Query:", formattedDate);
        const response = await apiRequest<AppointmentResponse[]>("GET", `/api/appointments/date/${formattedDate}`);
        
        // Debug della risposta
        console.log("React Query API Response for daily appointments:", response);
        
        // Verifica che la risposta sia un array
        if (!response || !Array.isArray(response)) {
          console.warn("React Query: Risposta API non valida (non è un array):", response);
          return [];
        }
        
        // Filtra elementi nulli o non validi prima della mappatura
        const validAppointments = response.filter(appointment => 
          appointment && typeof appointment === 'object' && appointment.id
        );
        
        console.log("React Query: Valid appointments count:", validAppointments.length);
        const mappedAppointments = validAppointments.map(mapAppointmentResponse);
        console.log("React Query: Mapped appointments:", mappedAppointments);
        
        return mappedAppointments;
      } catch (error) {
        console.error("React Query: Errore durante il recupero degli appuntamenti:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare gli appuntamenti",
          variant: "destructive",
        });
        return [];
      }
    },
    // Valore predefinito sicuro in caso di errore
    initialData: [],
    // Diminuisci il numero di tentativi per evitare troppi errori in caso di problemi
    retry: 2,
    // Imposta una scadenza dei dati più breve per garantire l'aggiornamento
    staleTime: 0, // Forza un refresh ogni volta
    // Aggiunge un refetch automatico quando la finestra riprende il focus
    refetchOnWindowFocus: true,
    // Tenta di aggiornare in background quando i dati sono scaduti
    refetchOnMount: true,
    // Forza il refetch ad ogni render del componente
    refetchInterval: 10000 // 10 secondi
  });

  // Combina gli appuntamenti da entrambe le fonti (caricamento diretto e React Query)
  const allAppointments = useMemo(() => {
    // Usa gli appuntamenti dal caricamento diretto se disponibili
    if (directAppointments && directAppointments.length > 0) {
      console.log("Utilizzando appuntamenti dal caricamento diretto:", directAppointments.length);
      return directAppointments;
    }
    
    // Altrimenti usa quelli da React Query
    if (appointments && Array.isArray(appointments) && appointments.length > 0) {
      console.log("Utilizzando appuntamenti da React Query:", appointments.length);
      return appointments;
    }
    
    // Se nessuna fonte ha appuntamenti, ritorna un array vuoto
    return [];
  }, [appointments, directAppointments]);
  
  // Gestione sicura degli appuntamenti e ordinamento per orario
  const sortedAppointments = useMemo(() => {
    if (allAppointments.length === 0) return [];
    
    return [...allAppointments].sort((a, b) => {
      // Controlla che time sia una stringa valida prima di confrontare
      if (typeof a.time === 'string' && typeof b.time === 'string') {
        return a.time.localeCompare(b.time);
      }
      return 0;
    });
  }, [allAppointments]);

  return (
    <MainLayout>
      <div className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agenda Giornaliera</h1>
            <p className="text-sm text-muted-foreground">
              Visualizza e gestisci gli appuntamenti del giorno selezionato
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal text-sm sm:text-base mt-1 sm:mt-0">
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

        <div className="grid gap-4 sm:gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-lg sm:text-xl">{format(date, "EEEE d MMMM yyyy", { locale: it })}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {sortedAppointments && sortedAppointments.length > 0
                  ? `${sortedAppointments.length} appuntamenti in programma`
                  : "Nessun appuntamento programmato"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : sortedAppointments && sortedAppointments.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {sortedAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={cn(
                          "w-2 sm:w-3 h-full min-h-[2.5rem] rounded-full", 
                          appointment.status === "completed" ? "bg-green-500" :
                          appointment.status === "cancelled" ? "bg-red-500" :
                          appointment.status === "confirmed" ? "bg-blue-500" : "bg-yellow-500"
                        )} />
                        <div>
                          <div className="font-medium flex items-start gap-1">
                            <time className="text-xs sm:text-sm font-semibold">
                              {typeof appointment.time === 'string' ? appointment.time.slice(0, 5) : '00:00'}
                            </time>
                            <span className="text-xs sm:text-sm text-muted-foreground mx-1">-</span>
                            <time className="text-xs sm:text-sm font-semibold">
                              {(() => {
                                try {
                                  // Calcolo sicuro dell'orario di fine appuntamento
                                  if (typeof appointment.time !== 'string' || !appointment.duration) {
                                    return '00:00';
                                  }
                                  
                                  const timeStr = appointment.time.length >= 5 ? appointment.time : '00:00';
                                  const baseDate = new Date(`2000-01-01T${timeStr}`);
                                  
                                  // Verifica validità della data
                                  if (isNaN(baseDate.getTime())) {
                                    return '00:00';
                                  }
                                  
                                  // Aggiungi minuti
                                  const endTime = addMinutes(baseDate, appointment.duration);
                                  return format(endTime, 'HH:mm');
                                } catch (e) {
                                  console.error('Errore nel calcolo dell\'orario di fine:', e);
                                  return '00:00';
                                }
                              })()}
                            </time>
                          </div>
                          <h4 className="font-medium text-sm sm:text-base">{appointment.clientName}</h4>
                          <div className="text-xs sm:text-sm text-muted-foreground">{appointment.serviceName}</div>
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 flex flex-wrap gap-1.5 sm:gap-2 items-center">
                        <div className="rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-primary/10 text-primary">
                          {typeof appointment.duration === 'number' && !isNaN(appointment.duration) 
                            ? `${appointment.duration} min` 
                            : '-- min'}
                        </div>
                        <div className="rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-primary/10 text-primary">
                          {typeof appointment.price === 'number' && !isNaN(appointment.price)
                            ? `${(appointment.price / 100).toFixed(2)} €`
                            : '--,-- €'}
                        </div>
                        <div className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium",
                          (() => {
                            const status = typeof appointment.status === 'string' ? appointment.status.toLowerCase() : '';
                            switch (status) {
                              case "completed": return "bg-green-100 text-green-800";
                              case "cancelled": return "bg-red-100 text-red-800";
                              case "confirmed": return "bg-blue-100 text-blue-800";
                              case "pending": return "bg-yellow-100 text-yellow-800";
                              default: return "bg-gray-100 text-gray-800";
                            }
                          })()
                        )}>
                          {(() => {
                            const status = typeof appointment.status === 'string' ? appointment.status.toLowerCase() : '';
                            switch (status) {
                              case "completed": return "Completato";
                              case "cancelled": return "Cancellato";
                              case "confirmed": return "Confermato";
                              case "pending": return "In attesa";
                              default: return "Stato sconosciuto";
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                  <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium">Nessun appuntamento per oggi</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-[250px] sm:max-w-sm mt-1 sm:mt-2">
                    Non ci sono appuntamenti programmati per questa data. Seleziona un'altra data o aggiungi un nuovo appuntamento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-center mt-2 sm:mt-4">
            <Button 
              variant="default" 
              className="w-full sm:w-auto"
              onClick={() => setIsAppointmentModalOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuovo Appuntamento
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Nuovo Appuntamento */}
      {isAppointmentModalOpen && (
        <NewAppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          selectedDate={date}
        />
      )}
    </MainLayout>
  );
}