import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO, startOfWeek, endOfWeek, isSameDay, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { User } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Calendar, 
  Info, 
  AlertTriangle,
  Coffee,
  CheckCircle2
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface BarberScheduleViewProps {
  barberId: number;
  barberName?: string;
}

type TimeSlot = {
  start: string;
  end: string;
  enabled: boolean;
};

type Break = {
  date: string;
  slots: { start: string; end: string }[];
};

export default function BarberScheduleView({ barberId, barberName }: BarberScheduleViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    return startOfWeek(today, { locale: it });
  });
  
  // Calcola la data di fine settimana
  const currentWeekEnd = endOfWeek(currentWeekStart, { locale: it });
  
  // Fetch dei dati del barbiere
  const { data: barber, isLoading } = useQuery<User>({
    queryKey: [`/api/users/${barberId}`],
    enabled: !!barberId,
  });

  // Funzioni per navigare tra le settimane
  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { locale: it }));
  };

  // Genera array di giorni della settimana corrente
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Ottieni il nome del giorno della settimana per un indice
  const getDayName = (date: Date) => {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return dayNames[date.getDay()];
  };

  // Funzione per controllare se un giorno è chiuso
  const isDayClosed = (date: Date): boolean => {
    if (!barber?.closedDays) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return barber.closedDays.includes(dateStr);
  };

  // Funzione per ottenere le pause per un giorno specifico
  const getBreaksForDay = (date: Date): { start: string; end: string }[] => {
    if (!barber?.breaks) return [];
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const breakForDay = barber.breaks.find(b => b.date === dateStr);
    
    return breakForDay?.slots || [];
  };

  // Funzione per ottenere gli orari di lavoro per un giorno specifico
  const getWorkingHoursForDay = (date: Date): TimeSlot[] => {
    if (!barber?.workingHours) return [];
    
    const dayName = getDayName(date);
    const dayData = barber.workingHours[dayName as keyof typeof barber.workingHours];
    
    // Se i dati sono in formato array, restituiscili direttamente
    if (Array.isArray(dayData)) {
      return dayData;
    }
    
    // Se i dati sono in formato { start, end }, convertili in array di TimeSlot
    if (dayData && typeof dayData === 'object' && 'start' in dayData && 'end' in dayData) {
      return [{
        start: dayData.start as string,
        end: dayData.end as string,
        enabled: true
      }];
    }
    
    return [];
  };

  // Controlla se la data è nel passato
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  };

  const renderWeeklySchedule = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-8 w-8">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-medium ml-2">
              {format(currentWeekStart, "d MMM", { locale: it })} - {format(currentWeekEnd, "d MMM yyyy", { locale: it })}
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek} className="h-8">
            Settimana corrente
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {daysOfWeek.map((day, index) => (
            <div key={index} className="text-sm font-medium">
              {format(day, "EEE", { locale: it })}
              <div className="text-xs text-muted-foreground">
                {format(day, "d MMM", { locale: it })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day, index) => {
            const isClosed = isDayClosed(day);
            const workingHours = getWorkingHoursForDay(day);
            const breaks = getBreaksForDay(day);
            const isToday = isSameDay(day, new Date());
            const isPast = isPastDate(day);
            
            return (
              <div
                key={index}
                className={cn(
                  "border rounded-md p-2 h-full min-h-28",
                  isToday ? "border-primary bg-primary/5" : "",
                  isClosed ? "bg-red-50" : "",
                  isPast ? "opacity-70" : ""
                )}
              >
                {isClosed ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-xs text-red-600 font-medium text-center">Chiuso</span>
                  </div>
                ) : workingHours.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center">Non disponibile</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workingHours
                      .filter(slot => slot.enabled)
                      .map((slot, slotIndex) => (
                        <div key={slotIndex} className="text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-primary" />
                              <span>{slot.start} - {slot.end}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {breaks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-muted">
                        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-xs">
                          <Coffee className="h-3 w-3 mr-1" />
                          {breaks.length} {breaks.length === 1 ? "pausa" : "pause"}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetailedView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }

    // Giorni della settimana
    const weekDays = [
      { key: "monday", label: "Lunedì" },
      { key: "tuesday", label: "Martedì" },
      { key: "wednesday", label: "Mercoledì" },
      { key: "thursday", label: "Giovedì" },
      { key: "friday", label: "Venerdì" },
      { key: "saturday", label: "Sabato" },
      { key: "sunday", label: "Domenica" },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {weekDays.map((day) => {
            const dayKey = day.key as keyof typeof barber.workingHours;
            const dayData = barber?.workingHours?.[dayKey];
            
            // Determina gli orari di lavoro in base al formato dei dati
            let slots: TimeSlot[] = [];
            let isOpen = false;
            
            if (Array.isArray(dayData)) {
              // Formato array di slot
              slots = dayData;
              isOpen = slots.some(slot => slot.enabled);
            } else if (dayData && typeof dayData === 'object' && 'start' in dayData && 'end' in dayData) {
              // Formato { start, end }
              slots = [{
                start: dayData.start as string,
                end: dayData.end as string,
                enabled: true
              }];
              isOpen = true;
            } else if (dayData === null) {
              // Giorno chiuso esplicitamente impostato come null
              isOpen = false;
            }
            
            return (
              <div key={day.key} className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{day.label}</h3>
                  {isOpen ? (
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aperto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted border-muted-foreground/30 text-muted-foreground">
                      Chiuso
                    </Badge>
                  )}
                </div>
                
                {isOpen ? (
                  <div className="space-y-2">
                    {slots
                      .filter(slot => slot.enabled !== false) // Considera enabled=true o undefined
                      .map((slot, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2 text-primary" />
                          <span>{slot.start} - {slot.end}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Non sono previsti orari di lavoro per questo giorno.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        
        {barber?.closedDays && barber.closedDays.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                Giorni di chiusura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {barber.closedDays
                  .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                  .map((dateStr, index) => {
                    const date = parseISO(dateStr);
                    const isPast = isPastDate(date);
                    
                    return (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className={cn(
                          "py-1 justify-start",
                          isPast ? "bg-muted/50 text-muted-foreground border-muted-foreground/30" : "bg-red-50 border-red-200 text-red-700"
                        )}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(date, "d MMMM yyyy", { locale: it })}
                      </Badge>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Orari di {barberName || "Barbiere"}
        </CardTitle>
        <CardDescription>
          Consulta gli orari di lavoro e le disponibilità del barbiere
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
            <TabsTrigger value="weekly">
              <Calendar className="h-4 w-4 mr-2" />
              Vista Settimanale
            </TabsTrigger>
            <TabsTrigger value="details">
              <Info className="h-4 w-4 mr-2" />
              Dettagli Completi
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly">
            {renderWeeklySchedule()}
          </TabsContent>
          
          <TabsContent value="details">
            {renderDetailedView()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}