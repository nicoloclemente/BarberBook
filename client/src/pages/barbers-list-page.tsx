import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Search, Scissors, Clock, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function BarbersListPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Recupera tutti i barbieri
  const { data: barbers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/barbers"],
  });

  // Filtra i barbieri in base alla query di ricerca
  const filteredBarbers = barbers?.filter((barber) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      barber.name.toLowerCase().includes(query) ||
      (barber.description && barber.description.toLowerCase().includes(query)) ||
      (barber.barberCode && barber.barberCode.toLowerCase().includes(query))
    );
  });

  // Genera le iniziali per l'avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Verifica quali giorni il barbiere è disponibile
  const getWorkingDays = (barber: User) => {
    if (!barber.workingHours) return [];
    
    const workingDays: string[] = [];
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const daysItalian = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    
    days.forEach((day, index) => {
      const dayData = barber.workingHours?.[day as keyof typeof barber.workingHours];
      let isWorking = false;
      
      if (Array.isArray(dayData)) {
        isWorking = dayData.some(slot => slot.enabled);
      } else if (dayData && typeof dayData === 'object' && 'start' in dayData) {
        isWorking = true;
      }
      
      if (isWorking) {
        workingDays.push(daysItalian[index]);
      }
    });
    
    return workingDays;
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Barbieri</h1>
            <p className="text-muted-foreground">
              Sfoglia l'elenco dei nostri barbieri professionisti e scopri i loro orari
            </p>
          </div>
        </div>

        {/* Barra di ricerca */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca barbiere per nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-0">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-4">
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Skeleton className="h-9 w-full rounded-md" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : !filteredBarbers || filteredBarbers.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nessun barbiere trovato</h2>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nessun risultato corrisponde alla tua ricerca. Prova a modificare i criteri di ricerca."
                : "Nessun barbiere disponibile al momento."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarbers.map((barber) => {
              const workingDays = getWorkingDays(barber);
              
              return (
                <Card key={barber.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={barber.imageUrl || undefined} />
                        <AvatarFallback>{getInitials(barber.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl">{barber.name}</CardTitle>
                        <CardDescription>Barbiere Professionista</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {barber.description || "Barbiere professionista con esperienza nel taglio e nella cura della barba."}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Giorni lavorativi:</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {workingDays.length > 0 ? (
                        workingDays.map((day, index) => (
                          <Badge key={index} variant="outline" className="bg-primary/5">
                            {day}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Nessun orario disponibile</span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button 
                      className="w-full" 
                      variant="default"
                      onClick={() => window.location.href = `/barbers/${barber.id}`}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Visualizza dettaglio
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}