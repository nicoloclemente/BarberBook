import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UserRole } from "@shared/schema";

interface DeleteAccountDialogProps {
  userId?: number;
  isAdmin?: boolean;
}

export default function DeleteAccountDialog({ userId, isAdmin = false }: DeleteAccountDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utilizziamo l'ID dell'utente corrente se non viene specificato un ID
  const targetUserId = userId || user?.id;

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!targetUserId) throw new Error("ID utente non valido");
      
      const response = await apiRequest("DELETE", `/api/users/${targetUserId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'eliminazione dell'account");
      }
      
      return true;
    },
    onSuccess: () => {
      setIsOpen(false);
      toast({
        title: "Account eliminato",
        description: "L'account è stato eliminato con successo.",
      });
      
      // Se l'utente ha eliminato il proprio account, verrà reindirizzato alla pagina di autenticazione
      // (il logout viene eseguito automaticamente dal server)
      if (!isAdmin || targetUserId === user?.id) {
        setTimeout(() => {
          navigate("/auth");
        }, 1500);
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("appuntamenti futuri")) {
        setError("Non puoi eliminare il tuo account perché hai appuntamenti futuri con clienti. Cancella o completa tutti gli appuntamenti prima di eliminare l'account.");
      } else {
        setError(error.message || "Si è verificato un errore durante l'eliminazione dell'account.");
      }
    },
  });

  const handleDelete = () => {
    setError(null);
    deleteAccountMutation.mutate();
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="mt-4"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isAdmin ? "Elimina utente" : "Elimina account"}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? "Elimina utente" : "Elimina il tuo account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin 
                ? "Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata e tutti i dati dell'utente saranno eliminati definitivamente."
                : "Sei sicuro di voler eliminare il tuo account? Questa azione non può essere annullata e tutti i tuoi dati saranno eliminati definitivamente."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {error && (
            <div className="flex items-start p-3 mb-2 text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-red-600" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>
              Annulla
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isAdmin ? "Elimina utente" : "Elimina account"}
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}