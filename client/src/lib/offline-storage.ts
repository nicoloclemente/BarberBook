/**
 * Gestore per la memoria offline dell'applicazione
 * Utilizza IndexedDB per memorizzare dati che possono essere utilizzati quando l'app è offline
 */

// Nome del database IndexedDB
const DB_NAME = 'barbershop_offline_db';
const DB_VERSION = 1;

// Nomi degli store che utilizzeremo
const STORE_NAMES = {
  APPOINTMENTS: 'appointments',
  CLIENTS: 'clients',
  SERVICES: 'services',
  PENDING_ACTIONS: 'pendingActions'
};

// Inizializzazione del database
let dbPromise: Promise<IDBDatabase>;

function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Errore nell\'apertura del database offline');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Creazione degli object store
      if (!db.objectStoreNames.contains(STORE_NAMES.APPOINTMENTS)) {
        const appointmentsStore = db.createObjectStore(STORE_NAMES.APPOINTMENTS, { keyPath: 'id' });
        appointmentsStore.createIndex('date', 'date', { unique: false });
        appointmentsStore.createIndex('clientId', 'clientId', { unique: false });
        appointmentsStore.createIndex('barberId', 'barberId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.CLIENTS)) {
        db.createObjectStore(STORE_NAMES.CLIENTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.SERVICES)) {
        db.createObjectStore(STORE_NAMES.SERVICES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.PENDING_ACTIONS)) {
        const pendingStore = db.createObjectStore(STORE_NAMES.PENDING_ACTIONS, { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('type', 'type', { unique: false });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Inizializziamo il database all'avvio
dbPromise = initDatabase();

/**
 * Interfaccia generica per le operazioni di storage
 */
interface OfflineStorageOperations<T> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T | undefined>;
  save(item: T): Promise<number>;
  saveAll(items: T[]): Promise<void>;
  remove(id: number): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Classe generica per l'accesso agli oggetti nel database
 */
class OfflineStore<T extends { id: number }> implements OfflineStorageOperations<T> {
  private storeName: string;

  constructor(storeName: string) {
    this.storeName = storeName;
  }

  /**
   * Ottiene tutti gli elementi dallo store
   */
  async getAll(): Promise<T[]> {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Ottiene un elemento specifico per ID
   */
  async getById(id: number): Promise<T | undefined> {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Salva un elemento nello store
   */
  async save(item: T): Promise<number> {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve(Number(request.result));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Salva un array di elementi nello store
   */
  async saveAll(items: T[]): Promise<void> {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      items.forEach(item => {
        store.put(item);
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  /**
   * Rimuove un elemento dallo store
   */
  async remove(id: number): Promise<void> {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Svuota lo store
   */
  async clear(): Promise<void> {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

/**
 * Interfaccia per le azioni in sospeso che verranno sincronizzate quando l'app tornerà online
 */
interface PendingAction {
  id?: number;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: any;
  timestamp: number;
  retries?: number;
}

/**
 * Classe per gestire le azioni in sospeso
 */
class PendingActionsStore {
  private store: OfflineStore<PendingAction>;

  constructor() {
    this.store = new OfflineStore<PendingAction>(STORE_NAMES.PENDING_ACTIONS);
  }

  /**
   * Aggiunge un'azione in sospeso
   */
  async addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<number> {
    const pendingAction: PendingAction = {
      ...action,
      timestamp: Date.now(),
      retries: 0
    };
    return this.store.save(pendingAction);
  }

  /**
   * Ottiene tutte le azioni in sospeso
   */
  async getAllPendingActions(): Promise<PendingAction[]> {
    return this.store.getAll();
  }

  /**
   * Rimuove un'azione in sospeso dopo che è stata completata
   */
  async removePendingAction(id: number): Promise<void> {
    return this.store.remove(id);
  }

  /**
   * Aggiorna un'azione in sospeso
   */
  async updatePendingAction(action: PendingAction): Promise<number> {
    return this.store.save(action);
  }
}

// Esporta le istanze degli store
export const appointmentsOfflineStore = new OfflineStore(STORE_NAMES.APPOINTMENTS);
export const clientsOfflineStore = new OfflineStore(STORE_NAMES.CLIENTS);
export const servicesOfflineStore = new OfflineStore(STORE_NAMES.SERVICES);
export const pendingActionsStore = new PendingActionsStore();

/**
 * Controlla se l'applicazione è online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Sincronizza le azioni in sospeso quando l'app torna online
 */
export async function syncPendingActions(): Promise<void> {
  if (!isOnline()) return;

  const pendingActions = await pendingActionsStore.getAllPendingActions();
  
  for (const action of pendingActions) {
    try {
      let response;
      
      switch (action.type) {
        case 'create':
        case 'update':
          response = await fetch(action.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(action.payload)
          });
          break;
        case 'delete':
          response = await fetch(action.endpoint, {
            method: 'DELETE'
          });
          break;
      }

      if (response && response.ok) {
        await pendingActionsStore.removePendingAction(action.id!);
      } else {
        // Incrementa il contatore dei tentativi
        action.retries = (action.retries || 0) + 1;
        
        // Se abbiamo provato troppe volte, rimuoviamo l'azione
        if (action.retries >= 5) {
          await pendingActionsStore.removePendingAction(action.id!);
          console.error(`Azione rimossa dopo ${action.retries} tentativi falliti:`, action);
        } else {
          await pendingActionsStore.updatePendingAction(action);
        }
      }
    } catch (error) {
      console.error('Errore durante la sincronizzazione dell\'azione:', error, action);
      // Incrementa il contatore dei tentativi
      action.retries = (action.retries || 0) + 1;
      if (action.retries < 5) {
        await pendingActionsStore.updatePendingAction(action);
      } else {
        await pendingActionsStore.removePendingAction(action.id!);
      }
    }
  }
}

// Registra gli event listener per la sincronizzazione
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App tornata online, sincronizzazione in corso...');
    syncPendingActions();
    
    // Trigger del background sync per il service worker se disponibile
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(sw => {
        sw.sync.register('sync-appointments');
        sw.sync.register('sync-messages');
      });
    }
  });
}