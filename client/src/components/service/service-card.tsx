import { Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface ServiceCardProps {
  service: Service;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ServiceCard({
  service,
  canEdit,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  // Format price from cents to euros
  const formattedPrice = (service.price / 100).toFixed(2);

  return (
    <div className="service-card bg-white rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md hover:translate-y-[-2px]">
      {service.imageUrl && (
        <img
          src={service.imageUrl}
          alt={service.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-heading font-semibold text-lg">{service.name}</h3>
          <span className="font-heading font-bold text-xl text-secondary">
            €{formattedPrice}
          </span>
        </div>
        <p className="text-neutral-dark text-sm mt-2">
          {service.description || "Nessuna descrizione disponibile."}
        </p>
        <div className="mt-3 text-sm text-neutral-dark">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{service.duration} minuti</span>
          </div>
        </div>
        {canEdit && (
          <div className="mt-4 flex justify-end space-x-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
