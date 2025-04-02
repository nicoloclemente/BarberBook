import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isFuture, isPast, isToday } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { connectWebSocket, addEventListener, removeEventListener } from "@/lib/websocket";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarX, CheckCircle, Clock, RefreshCw } from "lucide-react";
import AppointmentCard from "@/components/appointment/appointment-card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import NewAppointmentModal from "@/components/appointment/new-appointment-modal";

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Query per tutti gli appuntamenti dell'utente
  const { data: allAppointments = [], isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      try {
        const response = await apiRequest<AppointmentWithDetails[]>("GET", "/api/appointments");
        
        // Filtriamo gli appuntamenti con dati incompleti
        return (response || []).filter(appointment => {
          return appointment && 
                 typeof appointment === 'object' && 
                 appointment.service && 
                 typeof appointment.service === 'object' &&
                 appointment.service.duration !== undefined;
        });
      } catch (error) {
        console.error("Errore nel recupero degli appuntamenti:", error);
        return [];
      }
    },
    enabled: !!user,
    retry: 1,
  });
  
  // Separiamo gli appuntamenti in base alla loro data
  const appointments = React.useMemo(() => {
    const now = new Date();
    const upcoming: AppointmentWithDetails[] = [];
    const past: AppointmentWithDetails[] = [];
    const today: AppointmentWithDetails[] = [];
    
    allAppointments.forEach(appointment => {
      if (!appointment || !appointment.date) return;
      
      const appointmentDate = typeof appointment.date === 'string' 
        ? new Date(appointment.date) 
        : appointment.date;
      
      if (isToday(appointmentDate)) {
        today.push(appointment);
      } else if (isFuture(appointmentDate)) {
        upcoming.push(appointment);
      } else if (isPast(appointmentDate)) {
        past.push(appointment);
      }
    });
    
    // Ordiniamo gli appuntamenti per data (i più recenti/imminenti prima)
    const sortByDate = (a: AppointmentWithDetails, b: AppointmentWithDetails) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return activeTab === "past" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    };
    
    return {
      upcoming: upcoming.sort(sortByDate),
      past: past.sort(sortByDate),
      today: today.sort(sortByDate),
      all: allAppointments,
    };
  }, [allAppointments, activeTab]);

  // Mutazione per aggiornare lo stato di un appuntamento
  const handleUpdateStatus = (id: number, status: string) => {
    apiRequest("PATCH", `/api/appointments/${id}`, { status })
      .then(() => {
        toast({
          title: "Stato aggiornato",
          description: `Lo stato dell'appuntamento è stato aggiornato a ${status}`,
        });
        refetch();
      })
      .catch(error => {
        console.error("Errore nell'aggiornamento dello stato:", error);
        toast({
          title: "Errore",
          description: "Non è stato possibile aggiornare lo stato dell'appuntamento",
          variant: "destructive",
        });
      });
  };

  // Mutazione per eliminare un appuntamento
  const handleDeleteAppointment = (id: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo appuntamento?")) {
      apiRequest("DELETE", `/api/appointments/${id}`)
        .then(() => {
          toast({
            title: "Appuntamento eliminato",
            description: "L'appuntamento è stato eliminato con successo",
          });
          refetch();
        })
        .catch(error => {
          console.error("Errore nell'eliminazione dell'appuntamento:", error);
          toast({
            title: "Errore",
            description: "Non è stato possibile eliminare l'appuntamento",
            variant: "destructive",
          });
        });
    }
  };

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      connectWebSocket(user.id);

      const handleAppointmentEvent = () => {
        console.log("WebSocket: Ricevuto evento di appuntamento, aggiornamento lista appuntamenti");
        
        // Invalidiamo tutte le query relative agli appuntamenti
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        
        // Aggiorniamo immediatamente la vista corrente
        refetch();
      };

      addEventListener('appointment', handleAppointmentEvent);

      return () => {
        removeEventListener('appointment', handleAppointmentEvent);
      };
    }
  }, [user, refetch]);

  // Funzione per ottenere il colore del badge in base allo stato
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Confermato</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">In attesa</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancellato</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Completato</Badge>;
      default:
        return <Badge variant="outline">Sconosciuto</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h1 className="text-2xl font-heading font-bold text-primary">
            I miei appuntamenti
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isLoading}
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-10"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Aggiorna
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                if (user) {
                  console.log("Simulazione evento WebSocket per aggiornamento appuntamenti");
                  // Simuliamo un evento WebSocket per testare l'aggiornamento automatico
                  queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                  refetch();
                }
              }}
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a8.5 8.5 0 00-3.356 2.548 1 1 0 000 1.114A8.001 8.001 0 0115.357 12H17a1 1 0 100-2h-1.642A6.057 6.057 0 0110 8c-1.833 0-3.505.744-4.707 1.943a1 1 0 00-.285.908 6.002 6.002 0 0011.27 1.43 1 1 0 001.683 1.092 8 8 0 00-10.59-10.59l-.259-.966a1 1 0 00-.517-.734zM10 6a4 4 0 00-4 4h2a2 2 0 114 0h2a4 4 0 00-4-4z" clipRule="evenodd" />
              </svg>
              Simula WebSocket
            </Button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-10"
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Nuovo appuntamento
            </Button>
          </div>
        </div>

        <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="today" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
              <span className="hidden sm:inline">Oggi</span>
              <span className="inline sm:hidden">Oggi</span>
              {appointments.today.length > 0 && (
                <Badge variant="secondary" className="ml-1">{appointments.today.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
              <span className="hidden sm:inline">Prossimi</span>
              <span className="inline sm:hidden">Futuri</span>
              {appointments.upcoming.length > 0 && (
                <Badge variant="secondary" className="ml-1">{appointments.upcoming.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">
              <CalendarX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
              <span className="hidden sm:inline">Passati</span>
              <span className="inline sm:hidden">Passati</span>
              {appointments.past.length > 0 && (
                <Badge variant="secondary" className="ml-1">{appointments.past.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
              <span className="hidden sm:inline">Tutti</span>
              <span className="inline sm:hidden">Tutti</span>
              {appointments.all.length > 0 && (
                <Badge variant="secondary" className="ml-1">{appointments.all.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Appuntamenti di oggi</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : appointments.today.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appointments.today.map((appointment) => (
                      <AppointmentCard 
                        key={appointment.id}
                        appointment={appointment}
                        onStatusChange={handleUpdateStatus}
                        onDelete={handleDeleteAppointment}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessun appuntamento per oggi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Prossimi appuntamenti</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : appointments.upcoming.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appointments.upcoming.map((appointment) => (
                      <AppointmentCard 
                        key={appointment.id}
                        appointment={appointment}
                        onStatusChange={handleUpdateStatus}
                        onDelete={handleDeleteAppointment}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessun appuntamento futuro</p>
                    <Button 
                      variant="link" 
                      onClick={() => setIsModalOpen(true)}
                      className="mt-2"
                    >
                      Prenota un appuntamento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Appuntamenti passati</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : appointments.past.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appointments.past.map((appointment) => (
                      <AppointmentCard 
                        key={appointment.id}
                        appointment={appointment}
                        onStatusChange={handleUpdateStatus}
                        onDelete={handleDeleteAppointment}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessun appuntamento passato</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Tutti gli appuntamenti</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : appointments.all.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appointments.all.map((appointment) => (
                      <AppointmentCard 
                        key={appointment.id}
                        appointment={appointment}
                        onStatusChange={handleUpdateStatus}
                        onDelete={handleDeleteAppointment}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessun appuntamento</p>
                    <Button 
                      variant="link" 
                      onClick={() => setIsModalOpen(true)}
                      className="mt-2"
                    >
                      Prenota un appuntamento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />
    </MainLayout>
  );
}