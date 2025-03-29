import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Notification, NotificationType } from "@shared/schema";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Recupera le notifiche
  const {
    data: notifications,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
  });

  // Recupera il conteggio delle notifiche non lette
  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread/count"],
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
  });

  // Mutation per segnare una notifica come letta
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/notifications/${id}/read`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  // Mutation per segnare tutte le notifiche come lette
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/notifications/all/read", {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  // Quando si apre il popover, aggiorna le notifiche
  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    }
  }, [open, queryClient]);

  // Ottiene l'icona appropriata per il tipo di notifica
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case NotificationType.APPOINTMENT_REMINDER:
        return "🕒";
      case NotificationType.APPOINTMENT_CONFIRMATION:
        return "✅";
      case NotificationType.APPOINTMENT_CANCELLED:
        return "❌";
      case NotificationType.APPOINTMENT_MODIFIED:
        return "📝";
      case NotificationType.NEW_MESSAGE:
        return "💬";
      case NotificationType.SYSTEM:
        return "ℹ️";
      case NotificationType.APPOINTMENT_REQUEST:
        return "📲";
      default:
        return "📩";
    }
  };

  // Ottiene la classe CSS appropriata per lo stato di lettura della notifica
  const getNotificationClass = (isRead: boolean) => {
    return isRead ? "opacity-60" : "bg-blue-50 dark:bg-blue-950";
  };

  // Formatta la data della notifica
  const formatNotificationDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: it,
    });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // TODO: Aggiungere la navigazione in base al tipo di notifica
    if (notification.type === NotificationType.NEW_MESSAGE && notification.relatedId) {
      // Naviga alla chat con l'ID relatedId
      // redirect("/chat/...");
    } else if (
      (notification.type === NotificationType.APPOINTMENT_REMINDER ||
        notification.type === NotificationType.APPOINTMENT_CONFIRMATION ||
        notification.type === NotificationType.APPOINTMENT_MODIFIED ||
        notification.type === NotificationType.APPOINTMENT_CANCELLED ||
        notification.type === NotificationType.APPOINTMENT_REQUEST) &&
      notification.relatedId
    ) {
      // Naviga all'appuntamento con l'ID relatedId
      // redirect("/appointments/...");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount?.count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 px-1.5 h-5 min-w-5 flex items-center justify-center"
            >
              {unreadCount.count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-lg">Notifiche</h3>
          {unreadCount?.count > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              Segna tutte come lette
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="h-[400px] p-4">
          {isLoading ? (
            // Stato di caricamento
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[60px]" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
          ) : error ? (
            // Stato di errore
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-destructive">
                Si è verificato un errore nel caricamento delle notifiche.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
                }}
              >
                Riprova
              </Button>
            </div>
          ) : notifications?.length === 0 ? (
            // Nessuna notifica
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-muted-foreground">Non hai notifiche.</p>
            </div>
          ) : (
            // Elenco delle notifiche
            <div className="space-y-3">
              {notifications?.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-accent ${getNotificationClass(
                    notification.isRead
                  )}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <h4 className="font-medium">{notification.title}</h4>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}