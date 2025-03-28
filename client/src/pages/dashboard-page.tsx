import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentWithDetails } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { connectWebSocket, addEventListener, removeEventListener } from "@/lib/websocket";
import MainLayout from "@/components/main-layout";
import DateSelector from "@/components/appointment/date-selector";
import TimeSlots from "@/components/appointment/time-slots";
import AppointmentCard from "@/components/appointment/appointment-card";
import NewAppointmentModal from "@/components/appointment/new-appointment-modal";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  const { data: appointments = [], isLoading, refetch } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments/date', formattedDate],
    queryFn: () => getQueryFn({ on401: "throw" })({
      queryKey: [`/api/appointments/date/${formattedDate}`],
    }),
  });

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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-primary">
              {user?.isBarber ? "I tuoi appuntamenti" : "I miei appuntamenti"}
            </h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()} 
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Aggiorna
              </Button>
              <Button 
                onClick={() => setIsModalOpen(true)}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
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
            </h3>
            
            <TimeSlots 
              appointments={appointments} 
              selectedDate={selectedDate}
              onSlotClick={() => setIsModalOpen(true)}
            />
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
