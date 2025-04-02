import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  appointmentsOfflineStore,
  clientsOfflineStore,
  servicesOfflineStore,
  pendingActionsStore, 
  isOnline,
  syncPendingActions
} from "@/lib/offline-storage";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Funzione per convertire le date in formato ISO string per la serializzazione JSON
 * Questo evita problemi con oggetti Date nella serializzazione JSON
 */
function replaceDatesWithISOStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString(); // Converti le date in ISO string
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(replaceDatesWithISOStrings);
  }
  
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = replaceDatesWithISOStrings(obj[key]);
    }
  }
  
  return result;
}

export async function apiRequest<T = any>(
  method: string = "GET",
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Prepara i dati assicurandosi che gli oggetti Date siano convertiti in ISO string
  const processedData = data ? replaceDatesWithISOStrings(data) : undefined;
  
  // Gestione offline per operazioni di creazione e modifica
  const isOnlineStatus = isOnline();
  
  if (!isOnlineStatus && method !== "GET") {
    console.log(`Modalità offline: salvataggio dell'azione pendente per ${url}`);
    
    // Salvataggio dell'operazione per sincronizzazione futura
    const actionType = method === "DELETE" ? "delete" : 
                      (url.includes("/create") || url.includes("new") ? "create" : "update");
    
    // Salva l'azione pendente per la sincronizzazione quando si torna online
    await pendingActionsStore.addPendingAction({
      type: actionType,
      endpoint: url,
      payload: processedData
    });
    
    // Se è un'operazione di creazione di un appuntamento, salvala anche offline
    if (url.includes("/appointments") && (actionType === "create" || actionType === "update") && processedData) {
      try {
        // @ts-ignore - Ignoriamo i controlli di tipo poiché sappiamo che i dati sono validi
        await appointmentsOfflineStore.save(processedData);
      } catch (e) {
        console.error("Errore nel salvare l'appuntamento offline", e);
      }
    }
    
    // Simula una risposta di successo per permettere all'app di continuare a funzionare
    return { success: true, offlineCreated: true } as unknown as T;
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers: processedData ? { "Content-Type": "application/json" } : {},
      body: processedData ? JSON.stringify(processedData) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // Special handling for endpoints that return no content (like logout)
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return {} as T;
    }
    
    const result = await res.json();
    
    // Se siamo online e l'operazione ha avuto successo, possiamo salvare una copia locale dei dati
    // per l'accesso offline in seguito
    if (method === "GET") {
      if (url.includes("/appointments")) {
        try {
          // Salva gli appuntamenti nel database locale
          const appointments = Array.isArray(result) ? result : [result];
          await appointmentsOfflineStore.saveAll(appointments);
        } catch (e) {
          console.error("Errore nel salvare gli appuntamenti in cache offline", e);
        }
      } else if (url.includes("/services")) {
        try {
          // Salva i servizi nel database locale
          const services = Array.isArray(result) ? result : [result];
          await servicesOfflineStore.saveAll(services);
        } catch (e) {
          console.error("Errore nel salvare i servizi in cache offline", e);
        }
      } else if (url.includes("/clients")) {
        try {
          // Salva i clienti nel database locale
          const clients = Array.isArray(result) ? result : [result];
          await clientsOfflineStore.saveAll(clients);
        } catch (e) {
          console.error("Errore nel salvare i clienti in cache offline", e);
        }
      }
    }
    
    return result;
  } catch (e) {
    // Se siamo offline e stiamo tentando di recuperare dati
    if (!isOnlineStatus && method === "GET") {
      console.log(`Modalità offline: tentativo di recuperare dati offline per ${url}`);
      
      // Recupera i dati dall'archivio offline in base all'URL
      try {
        if (url.includes("/appointments")) {
          const appointments = await appointmentsOfflineStore.getAll();
          console.log("Recuperati appuntamenti da storage offline:", appointments.length);
          
          // Filtra se necessario (es. per data)
          if (url.includes("/date/")) {
            const dateStr = url.split("/date/")[1];
            const filteredAppointments = appointments.filter(app => {
              // Converti entrambe le date in formato stringa per confronto
              // Verifica che app.date esista prima di fare il confronto
              if (!app.date) return false;
              const appDate = new Date(app.date).toISOString().split('T')[0];
              return appDate === dateStr;
            });
            return filteredAppointments as unknown as T;
          }
          
          return appointments as unknown as T;
        } else if (url.includes("/services")) {
          const services = await servicesOfflineStore.getAll();
          console.log("Recuperati servizi da storage offline:", services.length);
          return services as unknown as T;
        } else if (url.includes("/clients")) {
          const clients = await clientsOfflineStore.getAll();
          console.log("Recuperati clienti da storage offline:", clients.length);
          return clients as unknown as T;
        }
      } catch (offlineError) {
        console.error("Errore nel recuperare i dati offline", offlineError);
      }
    }
    
    // Se il recupero offline fallisce o non è possibile, rilancia l'errore originale
    console.error("Error in API request:", e);
    throw e;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const isOnlineStatus = isOnline();
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
  
      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Cache dei dati per uso offline quando siamo online
      try {
        if (url.includes("/appointments")) {
          const appointments = Array.isArray(data) ? data : [data];
          await appointmentsOfflineStore.saveAll(appointments);
        } else if (url.includes("/services")) {
          const services = Array.isArray(data) ? data : [data];
          await servicesOfflineStore.saveAll(services);
        } else if (url.includes("/clients")) {
          const clients = Array.isArray(data) ? data : [data];
          await clientsOfflineStore.saveAll(clients);
        }
      } catch (e) {
        console.error("Errore nel salvare i dati in cache offline:", e);
      }
      
      return data;
    } catch (e) {
      // Modalità offline - prova a recuperare i dati locali
      if (!isOnlineStatus) {
        console.log(`Modalità offline: recupero dati da archivio locale per ${url}`);
        try {
          if (url.includes("/appointments")) {
            const appointments = await appointmentsOfflineStore.getAll();
            
            // Filtra per data se necessario
            if (url.includes("/date/")) {
              const dateStr = url.split("/date/")[1];
              const filteredAppointments = appointments.filter(app => {
                // Verifica che app.date esista prima di fare il confronto
                if (!app.date) return false;
                const appDate = new Date(app.date).toISOString().split('T')[0];
                return appDate === dateStr;
              });
              return filteredAppointments as unknown as T;
            }
            
            return appointments as unknown as T;
          } else if (url.includes("/services")) {
            const services = await servicesOfflineStore.getAll();
            return services as unknown as T;
          } else if (url.includes("/clients")) {
            const clients = await clientsOfflineStore.getAll();
            return clients as unknown as T;
          }
        } catch (offlineError) {
          console.error("Errore nel recupero dei dati offline:", offlineError);
        }
      }
      
      // Se il recupero offline fallisce o non è applicabile, rilancia l'errore originale
      throw e;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 secondi invece di 1 minuto per garantire aggiornamenti più frequenti 
      retry: 1, // Aggiungiamo un retry per gestire problemi di connessione intermittenti
      refetchOnMount: true, // Aggiornamento dati quando il componente viene montato
    },
    mutations: {
      retry: 1, // Anche per le mutazioni aggiungiamo un retry
    },
  },
});
