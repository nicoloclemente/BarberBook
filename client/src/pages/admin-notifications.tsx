import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import MainLayout from "@/components/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, 
  UserCog, 
  ArrowLeft
} from "lucide-react";

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Reindirizza se non è un amministratore
  useEffect(() => {
    if (!isAuthLoading && user && user.role !== 'admin') {
      window.location.href = "/dashboard";
    }
  }, [isAuthLoading, user]);

  // Carica tutte le notifiche (solo per admin)
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications/all'],
    enabled: user?.role === 'admin',
  });
  
  // Calcola la paginazione
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = notifications ? notifications.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = notifications ? Math.ceil(notifications.length / itemsPerPage) : 0;

  // Gestisce il cambio pagina
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Determina il tipo di badge in base al tipo di notifica
  const getNotificationBadge = (type: string) => {
    const badges: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      appointment_reminder: { label: "Promemoria", variant: "default" },
      appointment_reminder_same_day: { label: "Promemoria Oggi", variant: "secondary" },
      appointment_confirmation: { label: "Conferma", variant: "outline" },
      appointment_cancelled: { label: "Cancellazione", variant: "destructive" },
      appointment_modified: { label: "Modifica", variant: "default" },
      appointment_request: { label: "Richiesta", variant: "secondary" },
      new_message: { label: "Messaggio", variant: "outline" },
      system: { label: "Sistema", variant: "default" },
    };

    const badge = badges[type] || { label: type, variant: "default" };
    
    return (
      <Badge variant={badge.variant}>
        {badge.label}
      </Badge>
    );
  };

  // Se sta caricando l'autenticazione, mostra uno skeleton
  if (isAuthLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  // Se non è un amministratore, non mostrare nulla (verrà reindirizzato)
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Gestione Notifiche
          </h1>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2"
            >
              <UserCog className="h-4 w-4" />
              Profilo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Gestione Notifiche</CardTitle>
              <CardDescription>
                Visualizza e gestisci tutte le notifiche del sistema
              </CardDescription>
            </div>
            <Button onClick={() => refetch()}>Aggiorna</Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Utente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Messaggio</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>{notification.id}</TableCell>
                        <TableCell>{notification.userId}</TableCell>
                        <TableCell>{getNotificationBadge(notification.type)}</TableCell>
                        <TableCell>{notification.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                        <TableCell>
                          <Badge variant={notification.isRead ? "outline" : "default"}>
                            {notification.isRead ? "Letta" : "Non letta"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: it
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginazione */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Precedente
                    </Button>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Successiva
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nessuna notifica presente nel sistema</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}