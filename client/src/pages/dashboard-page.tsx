import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AppointmentWithDetails, UserRole } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { connectWebSocket, addEventListener, removeEventListener } from "@/lib/websocket";
import MainLayout from "@/components/main-layout";
import DateSelector from "@/components/appointment/date-selector";
import TimeSlots from "@/components/appointment/time-slots";
import AppointmentCard from "@/components/appointment/appointment-card";
import NewAppointmentModal from "@/components/appointment/new-appointment-modal";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw, UsersIcon } from "lucide-react";
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
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Non gestiamo più le pause direttamente dalla dashboard
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const isBarber = user?.role === UserRole.BARBER || user?.role === UserRole.ADMIN;
  const isManager = user?.isManager;
  
  // Verifica se un barbiere dipendente è già associato a un manager
  const isEmployeeBarber = user?.role === UserRole.BARBER && user?.isManager === false;
  const isAssignedToManager = isEmployeeBarber && user?.managerId !== null;
  
  // Debug per vedere i valori
  console.log("User info:", user);
  console.log("Is employee barber:", isEmployeeBarber, "Role:", user?.role, "isManager:", user?.isManager);
  console.log("Is assigned to manager:", isAssignedToManager, "managerId:", user?.managerId);

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

  // Non gestiamo più le pause dalla dashboard

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

  // La gestione delle pause è stata spostata nella pagina di gestione orari

  // Verifica i valori dell'utente per debug
  console.log("ROLE DEBUG", {
    role: user?.role, 
    roleEqualsBarber: user?.role === UserRole.BARBER,
    isManager: user?.isManager,
    managerId: user?.managerId,
    UserRole: UserRole,
    UserRoleBarber: UserRole.BARBER
  });
  
  // Mostriamo il messaggio di attesa solo per i barbieri (non manager) senza managerId
  if (user?.role === "barber" && user?.isManager !== true && user?.managerId === null) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
          <div className="px-4 py-8 bg-white rounded-lg shadow-md">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Account in attesa di associazione</h2>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <UsersIcon className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-600 mb-2 max-w-md">
                Il tuo account barbiere è stato creato con successo, ma per poter utilizzare tutte le funzionalità devi essere associato a un manager.
              </p>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
                <h3 className="text-md font-medium text-gray-800 mb-2">Prossimi passi:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Comunica il tuo username <span className="font-bold">{user?.username}</span> al tuo manager</li>
                  <li>Il manager ti assocerà come barbiere dipendente nel suo pannello di gestione</li>
                  <li>Dopo l'associazione, potrai visualizzare e gestire gli appuntamenti</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

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

          {/* Pulsante per accedere alla gestione dipendenti (solo per barbieri manager) */}
          {isBarber && isManager && (
            <div className="mb-4 flex justify-end">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => navigate("/employees")}
              >
                <UsersIcon className="h-4 w-4" />
                Gestione Dipendenti
              </Button>
            </div>
          )}

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
            </h3>
            
            <TimeSlots 
              appointments={appointments} 
              selectedDate={selectedDate}
              onSlotClick={() => setIsModalOpen(true)}
              isBarber={isBarber}
              breaks={userData?.breaks}
              user={user}
            />
            
            {/* Legenda per spiegare i colori degli slot */}
            <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Legenda colori:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-center text-[9px] text-emerald-700 font-medium"></div>
                  <span className="text-gray-700">Orario di lavoro</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-50 border border-amber-100 rounded-md flex items-center justify-center text-[9px] text-amber-700 font-medium"></div>
                  <span className="text-gray-700">Pausa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-center text-[9px] text-slate-400 font-medium"></div>
                  <span className="text-gray-700">Occupato</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center text-[9px] text-gray-500 font-medium"></div>
                  <span className="text-gray-700">Fuori orario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-100 rounded-md flex items-center justify-center text-[9px] text-red-700 font-medium"></div>
                  <span className="text-gray-700">Giorno chiusura</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />
    </MainLayout>
  );
}
