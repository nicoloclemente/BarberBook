import { format, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const handlePreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const formattedDate = format(selectedDate, "EEEE, d MMMM yyyy", { locale: it });

  // Capitalize the first letter of the day
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="flex items-center justify-between mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handlePreviousDay} 
        className="text-primary hover:bg-neutral-light h-9 w-9 sm:h-10 sm:w-10"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
      <h3 className="text-base sm:text-xl font-heading font-semibold text-center truncate max-w-[calc(100%-100px)]">
        {capitalizedDate}
      </h3>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleNextDay} 
        className="text-primary hover:bg-neutral-light h-9 w-9 sm:h-10 sm:w-10"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    </div>
  );
}
