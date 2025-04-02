import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { BellRing, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './alert';

export function PushNotificationManager() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Controlla se le notifiche push sono supportate dal browser
    const isSupported = () => {
      return 'serviceWorker' in navigator && 'PushManager' in window;
    };

    // Controlla se le notifiche sono già autorizzate
    const isEnabled = async () => {
      if (!isSupported()) return false;

      try {
        const sw = await navigator.serviceWorker.ready;
        const subscription = await sw.pushManager.getSubscription();
        return !!subscription;
      } catch (error) {
        console.error('Errore nel controllo dello stato delle notifiche push:', error);
        return false;
      }
    };

    const checkStatus = async () => {
      const supported = isSupported();
      setPushSupported(supported);

      if (supported) {
        const enabled = await isEnabled();
        setPushEnabled(enabled);

        // Mostra l'alert solo se le notifiche non sono abilitate
        // e l'utente non l'ha già chiuso recentemente
        const lastAlertDismiss = localStorage.getItem('pushAlertDismissed');
        const now = new Date().getTime();
        if (!enabled && (!lastAlertDismiss || (now - parseInt(lastAlertDismiss)) > 3 * 24 * 60 * 60 * 1000)) { // 3 giorni
          setShowAlert(true);
        }
      }
    };

    checkStatus();
  }, []);

  const subscribeToPushNotifications = async () => {
    if (!pushSupported) return;

    try {
      // Richiedi il permesso per le notifiche
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: "Permesso negato",
          description: "Non potrai ricevere notifiche push fino a quando non abiliterai i permessi nelle impostazioni del browser.",
          variant: "destructive"
        });
        return;
      }

      // Ottieni il Service Worker
      const sw = await navigator.serviceWorker.ready;
      
      // Ottieni o crea una sottoscrizione push
      let subscription = await sw.pushManager.getSubscription();
      
      if (!subscription) {
        // Crea una nuova sottoscrizione
        // Normalmente qui ci sarebbero le chiavi pubbliche VAPID del server
        const publicVapidKey = 'BNbKwE3NUkGtPWk-tfjP7xTcRLX9ULP8F54XVHrCL9_n9K09utJNfN9M0uiJWg_bKx1ld9JKgTnTI2Q9c_7lwWo';
        
        subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }

      // Invia la sottoscrizione al server
      await sendSubscriptionToServer(subscription);

      // Aggiorna lo stato
      setPushEnabled(true);
      setShowAlert(false);
      
      toast({
        title: "Notifiche abilitate",
        description: "Riceverai notifiche push per promemoria e aggiornamenti.",
      });
    } catch (error) {
      console.error('Errore durante la sottoscrizione alle notifiche push:', error);
      toast({
        title: "Errore",
        description: "Non è stato possibile abilitare le notifiche push. Riprova più tardi.",
        variant: "destructive"
      });
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!pushSupported) return;

    try {
      const sw = await navigator.serviceWorker.ready;
      const subscription = await sw.pushManager.getSubscription();
      
      if (!subscription) return;

      // Annulla la sottoscrizione
      await subscription.unsubscribe();
      
      // Notifica al server la cancellazione
      await deleteSubscriptionFromServer(subscription);

      // Aggiorna lo stato
      setPushEnabled(false);
      
      toast({
        title: "Notifiche disabilitate",
        description: "Non riceverai più notifiche push.",
      });
    } catch (error) {
      console.error('Errore durante la cancellazione delle notifiche push:', error);
      toast({
        title: "Errore",
        description: "Non è stato possibile disabilitare le notifiche push. Riprova più tardi.",
        variant: "destructive"
      });
    }
  };

  // Funzione per inviare la sottoscrizione al server (simulata)
  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    // In una vera implementazione, qui invieresti l'oggetto subscription al tuo server
    // con una chiamata API come:
    // await fetch('/api/push/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // });
    
    console.log('Sottoscrizione inviata al server:', subscription);
    return true;
  };

  // Funzione per cancellare la sottoscrizione dal server (simulata)
  const deleteSubscriptionFromServer = async (subscription: PushSubscription) => {
    // In una vera implementazione, qui cancelleresti la sottoscrizione dal tuo server
    // con una chiamata API
    console.log('Sottoscrizione cancellata dal server:', subscription);
    return true;
  };

  const dismissAlert = () => {
    setShowAlert(false);
    localStorage.setItem('pushAlertDismissed', new Date().getTime().toString());
  };

  // Funzione ausiliaria per convertire le chiavi VAPID base64 in Uint8Array
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!pushSupported) return null;

  if (showAlert) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Attiva le notifiche</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
          <span className="flex-1">
            Ricevi notifiche per appuntamenti, promemoria e messaggi anche quando non stai utilizzando l'app.
          </span>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={dismissAlert}
              className="text-gray-500"
            >
              Non ora
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={subscribeToPushNotifications}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Attiva
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}