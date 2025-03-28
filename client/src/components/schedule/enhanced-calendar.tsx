import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, getDay, isSameDay, parseISO, startOfMonth, startOfWeek, endOfMonth, endOfWeek, addDays, addMonths, subMonths, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentWithDetails } from "@shared/schema";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const weekDays = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const shortWeekDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

interface EnhancedCalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  userId?: number;
  isBarberView?: boolean;
}

export default function EnhancedCalendar({ onSelectDate, selectedDate, userId, isBarberView = false }: EnhancedCalendarProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");

  const { data: appointments } = useQuery<AppointmentWithDetails[]>({
    queryKey: [
      `/api/appointments/month/${format(currentMonth, 'yyyy-MM')}`,
      isBarberView ? userId : user?.id,
      isBarberView ? 'barber' : 'client'
    ],
    enabled: !!user
  });

  // Gestione del cambio mese
  const prevMonth = () => {
    if (calendarView === "month") {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addDays(currentMonth, -7));
    }
  };

  const nextMonth = () => {
    if (calendarView === "month") {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addDays(currentMonth, 7));
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generazione delle celle del calendario
  const generateCalendarDays = () => {
    let days = [];
    let startDate;
    let endDate;

    if (calendarView === "month") {
      startDate = startOfWeek(startOfMonth(currentMonth), { locale: it });
      endDate = endOfWeek(endOfMonth(currentMonth), { locale: it });
    } else {
      startDate = startOfWeek(currentMonth, { locale: it });
      endDate = addDays(startDate, 6);
    }

    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // Conta appuntamenti per una data specifica
  const getAppointmentsForDay = (day: Date) => {
    return appointments?.filter((appt) => isSameDay(parseISO(appt.date.toString()), day)) || [];
  };

  // Verifica se il calendario è visibile per generare gli slot solo quando necessario
  useEffect(() => {
    const daysInMonth = generateCalendarDays();
  }, [currentMonth, calendarView, appointments]);

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-medium ml-2">
          {calendarView === "month" 
            ? format(currentMonth, "MMMM yyyy", { locale: it }) 
            : `${format(startOfWeek(currentMonth, { locale: it }), "d MMM", { locale: it })} - ${format(endOfWeek(currentMonth, { locale: it }), "d MMM yyyy", { locale: it })}`
          }
        </h3>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday} className="h-8">
          Oggi
        </Button>
        <Select 
          value={calendarView} 
          onValueChange={(value) => setCalendarView(value as "month" | "week")}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue placeholder="Vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mese</SelectItem>
            <SelectItem value="week">Settimana</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderWeekDayHeaders = () => (
    <div className="grid grid-cols-7 mb-2">
      {weekDays.map((day, index) => (
        <div key={day} className="text-center py-2">
          <span className="hidden md:inline">{day}</span>
          <span className="md:hidden">{shortWeekDays[index]}</span>
        </div>
      ))}
    </div>
  );

  const renderCalendarDays = () => {
    const days = generateCalendarDays();
    return (
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          
          return (
            <div
              key={i}
              className={cn(
                "calendar-day aspect-square p-1 md:p-2 transition-all duration-200 cursor-pointer relative",
                isToday ? "bg-primary/5 font-medium" : "",
                isSelected ? "border-2 border-primary" : "",
                !isCurrentMonth && calendarView === "month" ? "opacity-40" : "",
                dayAppointments.length > 0 ? "has-appointments" : ""
              )}
              onClick={() => onSelectDate(day)}
            >
              <div className={cn(
                "flex flex-col h-full",
                isSelected ? "text-primary" : ""
              )}>
                <div className="text-center md:text-left">
                  {format(day, "d")}
                </div>
                
                {dayAppointments.length > 0 && (
                  <div className="mt-auto">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs w-full justify-center truncate",
                        dayAppointments.some(a => a.status === "confirmed") ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        dayAppointments.some(a => a.status === "pending") ? "bg-amber-50 border-amber-200 text-amber-700" :
                        "bg-blue-50 border-blue-200 text-blue-700"
                      )}
                    >
                      {dayAppointments.length} {dayAppointments.length === 1 ? "app." : "app."}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="calendar-container">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Calendario
        </CardTitle>
        <CardDescription>Seleziona una data per visualizzare gli appuntamenti</CardDescription>
      </CardHeader>
      <CardContent>
        {renderCalendarHeader()}
        {renderWeekDayHeaders()}
        {renderCalendarDays()}
      </CardContent>
    </Card>
  );
}