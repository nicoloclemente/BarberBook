import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/main-layout";
import WorkingHoursForm from "@/components/schedule/working-hours-form";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserRole } from "@shared/schema";
import { useLocation } from "wouter";
import { PageTransition } from "@/components/ui/page-transition";

export default function SchedulePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Debug: log dei dati workingHours per verificarne la struttura
  useEffect(() => {
    if (user) {
      console.log("User workingHours:", user.workingHours);
    }
  }, [user]);
  
  // Verifica se l'utente è un barbiere
  const isBarber = user && (user.isBarber || user.role === UserRole.BARBER);
  
  // Reindirizza se l'utente non è un barbiere
  useEffect(() => {
    if (user && !isBarber) {
      toast({
        title: "Accesso negato",
        description: "Solo i barbieri possono accedere alla gestione degli orari",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [user, isBarber, navigate, toast]);
  
  // Mostra un indicatore di caricamento se l'utente non è ancora disponibile
  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">Gestione Orari e Pause</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Caricamento delle informazioni in corso...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Se l'utente non è un barbiere, mostra un messaggio di errore (anche se dovremmo essere già stati reindirizzati)
  if (!isBarber) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">Gestione Orari e Pause</h1>
          </div>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Accesso non autorizzato</AlertTitle>
            <AlertDescription>Solo i barbieri possono accedere a questa pagina.</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">Gestione Orari e Pause</h1>
          </div>
          
          <p className="text-muted-foreground mb-8">
            Configura i tuoi orari di lavoro, le pause programmate e i giorni di chiusura. 
            Questi orari saranno visibili ai clienti e determineranno la disponibilità per le prenotazioni.
          </p>
          
          <WorkingHoursForm />
        </div>
      </PageTransition>
    </MainLayout>
  );
}