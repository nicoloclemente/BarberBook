import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Service, AppointmentWithDetails } from "@shared/schema";
import { Calendar, Clock, Scissors, CalendarRange, Users, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BarberScheduleView from "@/components/schedule/barber-schedule-view";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import ServiceCard from "@/components/service/service-card";

export default function BarberDetailPage() {
  const [, params] = useRoute("/barbers/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const barberId = params ? parseInt(params.id) : 0;
  const [selectedTab, setSelectedTab] = useState("info");

  // Recupera i dati del barbiere
  const { data: barber, isLoading: isBarberLoading } = useQuery<User>({
    queryKey: [`/api/barbers/${barberId}`],
    enabled: !!barberId,
  });

  // Recupera i servizi
  const { data: services, isLoading: isServicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Recupera gli appuntamenti recenti se sei il barbiere stesso
  const isOwnProfile = user?.id === barberId;
  const { data: recentAppointments, isLoading: isAppointmentsLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: [`/api/appointments/recent/${barberId}`],
    enabled: isOwnProfile,
  });

  // Genera le iniziali per l'avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isBarberLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!barber) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex flex-col items-center justify-center h-96">
            <h2 className="text-2xl font-bold mb-2">Barbiere non trovato</h2>
            <p className="text-muted-foreground mb-4">
              Il barbiere che stai cercando non esiste o non è più disponibile.
            </p>
            <Button variant="default" onClick={() => window.history.back()}>
              Torna indietro
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profilo del barbiere */}
          <div className="md:col-span-1">
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={barber.imageUrl || undefined} />
                    <AvatarFallback className="text-2xl">{getInitials(barber.name)}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-center">{barber.name}</CardTitle>
                  <CardDescription className="text-center">Barbiere Professionista</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {barber.barberCode && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Codice Barbiere</p>
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-mono p-2 w-full justify-center">
                        {barber.barberCode}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Aggiungi questo codice nel tuo profilo per collegarti a questo barbiere
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button 
                      variant="default" 
                      className="w-full" 
                      onClick={() => {
                        if (user) {
                          // Navigazione alla pagina di chat
                          window.location.href = `/chat/${barberId}`;
                        } else {
                          toast({
                            title: "Accesso richiesto",
                            description: "Devi accedere per chattare con un barbiere",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contatta
                    </Button>
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (user) {
                          // Navigazione alla pagina di prenotazione
                          window.location.href = "/appointments/new?barberId=" + barberId;
                        } else {
                          toast({
                            title: "Accesso richiesto",
                            description: "Devi accedere per prenotare un appuntamento",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Prenota Appuntamento
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenuto principale */}
          <div className="md:col-span-2">
            <Tabs defaultValue="info" className="w-full mb-6" onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <Users className="h-4 w-4 mr-2" />
                  Informazioni
                </TabsTrigger>
                <TabsTrigger value="schedule">
                  <Clock className="h-4 w-4 mr-2" />
                  Orari
                </TabsTrigger>
                <TabsTrigger value="services">
                  <Scissors className="h-4 w-4 mr-2" />
                  Servizi
                </TabsTrigger>
              </TabsList>

              {/* Tab Informazioni */}
              <TabsContent value="info" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informazioni Barbiere</CardTitle>
                    <CardDescription>Dettagli e informazioni di contatto</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg mb-2">Su di me</h3>
                      <p className="text-muted-foreground">
                        {barber.description || "Barbiere professionista con esperienza nel taglio e nella cura della barba."}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium text-lg mb-2">Informazioni di contatto</h3>
                      {barber.phone && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Telefono:</span>
                          <span>{barber.phone}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium text-lg mb-2">Orari di lavoro</h3>
                      <p className="text-muted-foreground mb-2">
                        Consulta la scheda "Orari" per vedere la disponibilità completa.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedTab("schedule")}
                      >
                        <CalendarRange className="h-4 w-4 mr-2" />
                        Visualizza orari completi
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Orari */}
              <TabsContent value="schedule" className="pt-4">
                <BarberScheduleView barberId={barberId} barberName={barber.name} />
              </TabsContent>

              {/* Tab Servizi */}
              <TabsContent value="services" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Servizi Offerti</CardTitle>
                    <CardDescription>Esplora i servizi disponibili</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isServicesLoading ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : services && services.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services.map((service) => (
                          <ServiceCard 
                            key={service.id} 
                            service={service} 
                            onBook={() => {
                              if (user) {
                                window.location.href = `/appointments/new?barberId=${barberId}&serviceId=${service.id}`;
                              } else {
                                toast({
                                  title: "Accesso richiesto",
                                  description: "Devi accedere per prenotare un appuntamento",
                                  variant: "destructive",
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Nessun servizio disponibile al momento.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}