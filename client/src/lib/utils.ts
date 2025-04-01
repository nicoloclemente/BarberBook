import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isToday, isYesterday } from "date-fns"
import { it } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatta una data in un formato leggibile in italiano
 * @param date Data da formattare
 * @returns Stringa formattata
 */
export function formatDateHuman(date: Date | string): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return `Oggi, ${format(dateObj, 'HH:mm')}`;
  } else if (isYesterday(dateObj)) {
    return `Ieri, ${format(dateObj, 'HH:mm')}`;
  } else {
    return format(dateObj, 'd MMM yyyy, HH:mm', { locale: it });
  }
}

/**
 * Crea un effetto di feedback tattile
 */
export function hapticFeedback(pattern: 'success' | 'error' | 'warning' | 'light' = 'light'): void {
  if (!window.navigator.vibrate) return;
  
  switch (pattern) {
    case 'success':
      window.navigator.vibrate([40]);
      break;
    case 'error':
      window.navigator.vibrate([70, 50, 70]);
      break;
    case 'warning':
      window.navigator.vibrate([50, 30, 50]);
      break;
    case 'light':
    default:
      window.navigator.vibrate([15]);
      break;
  }
}

/**
 * Genera un colore casuale ma leggibile per identificatori
 * @param text Testo da usare come base per il colore
 * @returns Stringa del colore in formato HEX
 */
export function generatePastelColor(text: string): string {
  // Codifica hash semplice
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Genera colori pastello piacevoli
  const hue = (hash % 360);
  return `hsl(${hue}, 70%, 80%)`;
}

/**
 * Mostra un messaggio toast ergonomico
 */
export function showToast(message: string, duration = 3000): void {
  // Crea elemento toast se non esiste
  let toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; align-items: center; gap: 8px;';
    document.body.appendChild(toastContainer);
  }
  
  // Crea nuovo toast
  const toast = document.createElement('div');
  toast.className = 'toast scale-in';
  toast.textContent = message;
  toast.style.cssText = 'background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 18px; font-size: 14px; max-width: 300px; text-align: center; backdrop-filter: blur(5px); opacity: 0; transform: translateY(20px); transition: opacity 0.2s, transform 0.2s;';
  
  toastContainer.appendChild(toast);
  
  // Mostra toast con animazione
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Rimuovi dopo il tempo indicato
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, duration);
}
