import { Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Clock, EuroIcon } from "lucide-react";

interface ServiceCardProps {
  service: Service;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onBook?: () => void;
}

export default function ServiceCard({
  service,
  canEdit,
  onEdit,
  onDelete,
  onBook,
}: ServiceCardProps) {
  // Format price from cents to euros
  const formattedPrice = (service.price / 100).toFixed(2);

  return (
    <div className="service-card bg-white rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md hover:translate-y-[-2px] relative">
      {service.imageUrl ? (
        <img
          src={service.imageUrl}
          alt={service.name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="h-16 bg-primary/5 flex items-center justify-center">
          <span className="text-primary/50 text-lg font-semibold">{service.name}</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-heading font-semibold text-lg">{service.name}</h3>
        </div>
        <p className="text-neutral-dark text-sm mt-2">
          {service.description || "Nessuna descrizione disponibile."}
        </p>
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center text-sm text-neutral-dark">
            <Clock className="h-4 w-4 mr-1" />
            <span>{service.duration} minuti</span>
          </div>
          <div className="text-sm bg-primary text-white px-3 py-1.5 rounded-full flex items-center shadow">
            <EuroIcon className="h-4 w-4 mr-1" />
            <span className="font-bold">{formattedPrice}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          {onBook && (
            <Button
              variant="default"
              size="sm"
              onClick={onBook}
            >
              Prenota
            </Button>
          )}
          
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
              >
                Elimina
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                size="sm"
                onClick={onEdit}
              >
                Modifica
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
