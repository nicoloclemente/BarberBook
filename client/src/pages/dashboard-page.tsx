import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentWithDetails, UserRole } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { connectWebSocket, addEventListener, removeEventListener } from "@/lib/websocket";
import MainLayout from "@/components/main-layout";
import DateSelector from "@/components/appointment/date-selector";
import TimeSlots from "@/components/appointment/time-slots";
import AppointmentCard from "@/components/appointment/appointment-card";
import NewAppointmentModal from "@/components/appointment/new-appointment-modal";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw } from "lucide-react";
import { format, parseISO, formatISO } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  const [selectedBreak, setSelectedBreak] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const isBarber = user?.role === UserRole.BARBER || user?.role === UserRole.ADMIN;

  // Query per gli appuntamenti
  const { data: appointments = [], isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments/date', formattedDate],
    queryFn: () => getQueryFn({ on401: "throw" })({
      queryKey: [`/api/appointments/date/${formattedDate}`],
    }),
  });

  // Query per ottenere i dati dell'utente (con pause)
  const { data: userData } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => getQueryFn({ on401: "throw" })({
      queryKey: ['/api/me'],
    }),
    enabled: !!user && isBarber,
  });

  // Mutation per gli appuntamenti
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PUT", `/api/appointments/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', formattedDate] });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', formattedDate] });
    },
  });

  // Mutation per aggiornare le pause dell'utente
  const updateBreaksMutation = useMutation({
    mutationFn: async (breaks: { date: string; slots: { start: string; end: string }[] }[]) => {
      const res = await apiRequest("PUT", "/api/me", { breaks });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: "Pausa aggiornata",
        description: "La pausa è stata aggiornata con successo.",
      });
      setIsBreakDialogOpen(false);
    },
  });

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      connectWebSocket(user.id);

      const handleNewAppointment = () => {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', formattedDate] });
      };

      addEventListener('appointment', handleNewAppointment);

      return () => {
        removeEventListener('appointment', handleNewAppointment);
      };
    }
  }, [user, formattedDate]);

  const handleUpdateStatus = (id: number, status: string) => {
    updateAppointmentMutation.mutate({ id, data: { status } });
  };

  const handleDeleteAppointment = (id: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo appuntamento?")) {
      deleteAppointmentMutation.mutate(id);
    }
  };

  // Gestione delle pause
  const handleBreakClick = (time: { start: string; end: string }) => {
    setSelectedBreak(time);
    setIsBreakDialogOpen(true);
  };

  const handleSaveBreak = () => {
    if (!userData || !user) return;
    
    const formattedDateISO = formatISO(selectedDate, { representation: 'date' });
    const existingBreaks = userData.breaks || [];
    let updatedBreaks;
    
    // Trova se esiste già una pausa per questa data
    const breakIndex = existingBreaks.findIndex(b => b.date === formattedDateISO);
    
    if (breakIndex >= 0) {
      // Aggiorna la pausa esistente
      updatedBreaks = [...existingBreaks];
      
      // Cerca se esiste già uno slot con lo stesso orario di inizio
      const slotIndex = updatedBreaks[breakIndex].slots.findIndex(s => s.start === selectedBreak.start);
      
      if (slotIndex >= 0) {
        // Aggiorna lo slot esistente
        updatedBreaks[breakIndex].slots[slotIndex] = {
          ...selectedBreak
        };
      } else {
        // Aggiungi un nuovo slot
        updatedBreaks[breakIndex].slots.push(selectedBreak);
      }
    } else {
      // Crea una nuova pausa per questa data
      updatedBreaks = [
        ...existingBreaks,
        {
          date: formattedDateISO,
          slots: [selectedBreak]
        }
      ];
    }
    
    // Salva le pause aggiornate
    updateBreaksMutation.mutate(updatedBreaks);
  };

  // Funzione per eliminare la pausa
  const handleDeleteBreak = () => {
    if (!userData || !user) return;
    
    const formattedDateISO = formatISO(selectedDate, { representation: 'date' });
    const existingBreaks = userData.breaks || [];
    let updatedBreaks;
    
    // Trova se esiste già una pausa per questa data
    const breakIndex = existingBreaks.findIndex(b => b.date === formattedDateISO);
    
    if (breakIndex >= 0) {
      updatedBreaks = [...existingBreaks];
      
      // Cerca lo slot con lo stesso orario di inizio
      const slotIndex = updatedBreaks[breakIndex].slots.findIndex(s => s.start === selectedBreak.start);
      
      if (slotIndex >= 0) {
        // Rimuovi lo slot
        updatedBreaks[breakIndex].slots = updatedBreaks[breakIndex].slots.filter((_, i) => i !== slotIndex);
        
        // Se non ci sono più slot, rimuovi l'intera pausa
        if (updatedBreaks[breakIndex].slots.length === 0) {
          updatedBreaks = updatedBreaks.filter((_, i) => i !== breakIndex);
        }
        
        // Salva le pause aggiornate
        updateBreaksMutation.mutate(updatedBreaks);
      }
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2 className="text-2xl font-heading font-bold text-primary">
              {user?.isBarber ? "I tuoi appuntamenti" : "I miei appuntamenti"}
            </h2>
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
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="text-xs sm:text-sm h-8 sm:h-10"
              >
                <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Nuovo appuntamento
              </Button>
            </div>
          </div>

          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {appointments.map((appointment) => (
              <AppointmentCard 
                key={appointment.id}
                appointment={appointment}
                onStatusChange={handleUpdateStatus}
                onDelete={handleDeleteAppointment}
              />
            ))}
            
            {appointments.length === 0 && !isLoading && (
              <div className="col-span-full py-8 text-center">
                <p className="text-gray-500">Nessun appuntamento per questa data</p>
                <Button 
                  variant="link" 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2"
                >
                  Aggiungi un appuntamento
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-xl font-heading font-semibold mb-4 border-b pb-2">
              Disponibilità del giorno
              {isBarber && (
                <span className="text-xs sm:text-sm font-normal block sm:inline sm:ml-2 text-gray-500">
                  (Clicca sulle pause per modificarle)
                </span>
              )}
            </h3>
            
            <TimeSlots 
              appointments={appointments} 
              selectedDate={selectedDate}
              onSlotClick={() => setIsModalOpen(true)}
              isBarber={isBarber}
              onBreakClick={handleBreakClick}
              breaks={userData?.breaks}
              user={user}
            />
          </div>
        </div>
      </div>

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />

      {/* Dialogo per la modifica delle pause */}
      <Dialog open={isBreakDialogOpen} onOpenChange={setIsBreakDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[calc(100%-2rem)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Modifica pausa</DialogTitle>
            <DialogDescription>
              Imposta l'orario di inizio e fine della pausa
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="break-start">Inizio pausa</Label>
                <Input
                  id="break-start"
                  value={selectedBreak.start}
                  onChange={(e) => setSelectedBreak({ ...selectedBreak, start: e.target.value })}
                  placeholder="10:00"
                  type="time"
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="break-end">Fine pausa</Label>
                <Input
                  id="break-end"
                  value={selectedBreak.end}
                  onChange={(e) => setSelectedBreak({ ...selectedBreak, end: e.target.value })}
                  placeholder="11:00"
                  type="time"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteBreak}
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-10"
            >
              Elimina pausa
            </Button>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsBreakDialogOpen(false)}
                size="sm"
                className="text-xs sm:text-sm h-8 sm:h-10"
              >
                Annulla
              </Button>
              <Button 
                onClick={handleSaveBreak}
                size="sm"
                className="text-xs sm:text-sm h-8 sm:h-10"
              >
                Salva
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
