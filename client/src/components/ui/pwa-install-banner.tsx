import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { X } from 'lucide-react';
import { Card, CardContent } from './card';

// Interfaccia per l'evento BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Controlla se l'app è già installata o se il browser supporta l'installazione
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isStandalone) {
      // Se l'app è già installata, non mostrare il banner
      return;
    }

    // Memorizza l'evento beforeinstallprompt per usarlo in seguito
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      
      // Mostra il banner dopo un breve ritardo (lascia che l'utente si abitui all'app)
      setTimeout(() => {
        // Controlla se l'utente ha già visto il banner di recente
        const lastPrompt = localStorage.getItem('pwaPromptDismissed');
        const now = new Date().getTime();
        if (!lastPrompt || (now - parseInt(lastPrompt)) > 7 * 24 * 60 * 60 * 1000) { // 7 giorni
          setShowBanner(true);
        }
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    
    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('L\'utente ha accettato l\'installazione');
      } else {
        console.log('L\'utente ha rifiutato l\'installazione');
        // Salva quando l'utente ha rifiutato l'installazione
        localStorage.setItem('pwaPromptDismissed', new Date().getTime().toString());
      }
      
      // Reset del prompt - non può essere utilizzato due volte
      setInstallPrompt(null);
      setShowBanner(false);
    } catch (error) {
      console.error('Errore durante l\'installazione dell\'app:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Salva quando l'utente ha chiuso il banner
    localStorage.setItem('pwaPromptDismissed', new Date().getTime().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <Card className="border border-gray-200 shadow-lg">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Installa l'app</h3>
            <p className="text-sm text-gray-600">
              Aggiungi Barbershop alla schermata home per un accesso più veloce e un'esperienza ottimizzata
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDismiss}
              className="text-gray-500"
            >
              <X className="h-4 w-4 mr-1" /> Non ora
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleInstall}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Installa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}