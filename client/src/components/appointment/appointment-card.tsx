import { AppointmentWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ProfileImage } from "@/components/ui/profile-image";
import { PencilIcon, TrashIcon, MessageSquareIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}

export default function AppointmentCard({ 
  appointment, 
  onStatusChange, 
  onDelete 
}: AppointmentCardProps) {
  const { user } = useAuth();
  const isBarber = user?.isBarber;
  
  const formatTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'HH:mm');
  };
  
  const formatDuration = (duration: number) => {
    const serviceDuration = appointment.service.duration;
    const startDate = typeof appointment.date === 'string' 
      ? parseISO(appointment.date) 
      : appointment.date;
    
    const endDate = new Date(startDate.getTime() + serviceDuration * 60000);
    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'border-success';
      case 'pending': return 'border-warning';
      case 'cancelled': return 'border-error';
      default: return 'border-info';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed':
        return <span className="text-xs font-semibold text-success px-2 py-1 bg-green-100 rounded-full">Confermato</span>;
      case 'pending':
        return <span className="text-xs font-semibold text-warning px-2 py-1 bg-orange-100 rounded-full">In attesa</span>;
      case 'cancelled':
        return <span className="text-xs font-semibold text-error px-2 py-1 bg-red-100 rounded-full">Cancellato</span>;
      case 'completed':
        return <span className="text-xs font-semibold text-success px-2 py-1 bg-green-100 rounded-full">Completato</span>;
      default:
        return <span className="text-xs font-semibold text-info px-2 py-1 bg-blue-100 rounded-full">Walk-in</span>;
    }
  };

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${getStatusColor(appointment.status)}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          {getStatusBadge(appointment.status)}
          <h4 className="mt-2 font-semibold text-primary">{formatDuration(appointment.service.duration)}</h4>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" title="Modifica" className="h-8 w-8">
            <PencilIcon className="h-4 w-4 text-neutral-dark hover:text-primary" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Elimina"
            className="h-8 w-8"
            onClick={() => onDelete(appointment.id)}
          >
            <TrashIcon className="h-4 w-4 text-neutral-dark hover:text-error" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center mb-3">
        <ProfileImage user={appointment.client} className="mr-3" />
        <div>
          <div className="font-medium">{appointment.client.name}</div>
          <div className="text-sm text-neutral-dark">
            {appointment.client.phone || 'Nessun telefono'}
          </div>
        </div>
      </div>
      
      <div className="border-t border-neutral-light pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-dark">Servizio:</span>
          <span className="font-medium">{appointment.service.name}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-neutral-dark">Prezzo:</span>
          <span className="font-medium">{formatPrice(appointment.service.price)}</span>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" asChild className="text-primary text-sm p-0 h-auto">
          <Link href={`/chat/${appointment.client.id}`} className="flex items-center hover:underline">
            <MessageSquareIcon className="h-4 w-4 mr-1" />
            Invia messaggio
          </Link>
        </Button>
        
        {isBarber && appointment.status === 'pending' && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onStatusChange(appointment.id, 'cancelled')}
            >
              Rifiuta
            </Button>
            <Button 
              className="bg-success hover:bg-success/90"
              size="sm"
              onClick={() => onStatusChange(appointment.id, 'confirmed')}
            >
              Conferma
            </Button>
          </div>
        )}
        
        {isBarber && (appointment.status === 'confirmed' || appointment.status === 'walk_in') && (
          <Button 
            size="sm"
            onClick={() => onStatusChange(appointment.id, 'completed')}
          >
            Completa
          </Button>
        )}
      </div>
    </div>
  );
}
