/**
 * Un modulo ottimizzato per la memorizzazione nella cache delle query frequenti
 * per ridurre il carico sul database e diminuire il consumo di memoria.
 * Implementa TTL variabili basati sul tipo di dato e invalidazione selettiva.
 */

type CacheKey = string;
type CacheKeyType = 'user' | 'working-hours' | 'appointment' | 'service' | 'statistics' | 'default';
type TagName = string;

interface CacheItem<T> {
  data: T;
  expiry: number;
  tags?: TagName[];
}

interface CacheOptions {
  ttlMs?: number;
  keyType?: CacheKeyType;
  tags?: TagName[];
}

class MemoryCache {
  private cache: Map<CacheKey, CacheItem<unknown>>;
  private readonly TTL = {
    DEFAULT: 5 * 60 * 1000,         // 5 minuti di default
    USER: 10 * 60 * 1000,           // 10 minuti per dati utente
    WORKING_HOURS: 30 * 60 * 1000,  // 30 minuti per orari di lavoro
    APPOINTMENT: 2 * 60 * 1000,     // 2 minuti per appuntamenti
    SERVICE: 15 * 60 * 1000,        // 15 minuti per servizi (relativamente statici)
    STATISTICS: 20 * 60 * 1000,     // 20 minuti per statistiche
  };
  
  // Limiti di dimensione per gestione efficiente della memoria
  private readonly MAX_CACHE_SIZE = 5000;
  private readonly CLEANUP_THRESHOLD = 4000;

  constructor() {
    this.cache = new Map();
    
    // Pianifica la pulizia periodica della cache ogni 5 minuti
    setInterval(() => this.cleanExpiredItems(), 5 * 60 * 1000);
    
    // Log di monitoraggio della cache, solo in ambiente di sviluppo
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        console.log(`Cache: ${this.cache.size} items, memory usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
      }, 15 * 60 * 1000);
    }
  }

  /**
   * Ottiene un elemento dalla cache
   * @param key Chiave dell'elemento
   * @returns L'elemento memorizzato, o undefined se non presente o scaduto
   */
  get<T>(key: CacheKey): T | undefined {
    const item = this.cache.get(key);
    const now = Date.now();
    
    // Se l'elemento non esiste o è scaduto
    if (!item || item.expiry < now) {
      if (item) this.delete(key); // Rimuovi l'elemento scaduto
      return undefined;
    }
    
    return item.data as T;
  }

  /**
   * Memorizza un elemento nella cache
   * @param key Chiave dell'elemento
   * @param data Dati da memorizzare
   * @param ttlMs Durata in millisecondi (opzionale, default 5 minuti)
   * @param tags Array di tag per raggruppare elementi correlati
   */
  set<T>(key: CacheKey, data: T, ttlMs = this.TTL.DEFAULT, tags?: TagName[]): void {
    // Verifica se la cache ha superato la dimensione massima
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.enforceMemoryLimits();
    }
    
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry, tags });
  }
  
  /**
   * Invalida elementi nella cache in base al tag
   * @param tag Il tag degli elementi da invalidare
   * @returns Il numero di elementi invalidati
   */
  invalidateByTag(tag: TagName): number {
    let count = 0;
    const keysToDelete: CacheKey[] = [];
    
    // Prima identifica tutte le chiavi da eliminare
    this.cache.forEach((item, key) => {
      if (item.tags?.includes(tag)) {
        keysToDelete.push(key);
        count++;
      }
    });
    
    // Poi eliminale (per evitare problemi di mutazione durante l'iterazione)
    keysToDelete.forEach(key => this.delete(key));
    
    return count;
  }
  
  /**
   * Determina il TTL appropriato in base al tipo di dati
   * @param keyType Il tipo di dati da memorizzare
   * @returns Durata TTL in millisecondi
   */
  getTtlForType(keyType: CacheKeyType): number {
    switch (keyType) {
      case 'user':
        return this.TTL.USER;
      case 'working-hours':
        return this.TTL.WORKING_HOURS;
      case 'appointment':
        return this.TTL.APPOINTMENT;
      case 'service':
        return this.TTL.SERVICE;
      case 'statistics':
        return this.TTL.STATISTICS;
      default:
        return this.TTL.DEFAULT;
    }
  }

  /**
   * Rimuove un elemento dalla cache
   * @param key Chiave dell'elemento da rimuovere
   * @returns true se l'elemento è stato rimosso, false altrimenti
   */
  delete(key: CacheKey): boolean {
    return this.cache.delete(key);
  }

  /**
   * Rimuove tutti gli elementi dalla cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Rimuove tutti gli elementi scaduti dalla cache
   * @returns Il numero di elementi rimossi
   */
  cleanExpiredItems(): number {
    const now = Date.now();
    const keysToDelete: CacheKey[] = [];
    
    // Identifica gli elementi scaduti usando forEach invece di entries()
    this.cache.forEach((item, key) => {
      if (item.expiry < now) {
        keysToDelete.push(key);
      }
    });
    
    // Rimuovi gli elementi scaduti
    keysToDelete.forEach(key => this.cache.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Riduce la dimensione della cache quando supera i limiti
   * Rimuove gli elementi più vecchi prima
   * @private
   */
  private enforceMemoryLimits(): void {
    if (this.cache.size <= this.CLEANUP_THRESHOLD) return;
    
    // Crea un array di elementi da ordinare senza usare entries()
    const items: [string, number][] = [];
    this.cache.forEach((item, key) => {
      items.push([key, item.expiry]);
    });
    
    // Ordina per tempo di scadenza (rimuovi prima i più vecchi)
    items.sort((a, b) => a[1] - b[1]);
    
    // Rimuovi il 20% degli elementi più vecchi
    const itemsToRemove = Math.floor(items.length * 0.2);
    for (let i = 0; i < itemsToRemove; i++) {
      this.cache.delete(items[i][0]);
    }
  }

  /**
   * Recupera un elemento dalla cache o lo crea utilizzando la funzione fornita
   * @param key Chiave dell'elemento
   * @param fetchFn Funzione per recuperare i dati se non presenti in cache
   * @param options Opzioni di configurazione
   * @returns I dati dalla cache o dalla funzione fetchFn
   */
  async getOrSet<T>(
    key: CacheKey, 
    fetchFn: () => Promise<T>, 
    options?: CacheOptions
  ): Promise<T> {
    // Prova a ottenere dalla cache
    const cachedItem = this.get<T>(key);
    if (cachedItem !== undefined) {
      return cachedItem;
    }
    
    try {
      // Recupera i dati freschi
      const data = await fetchFn();
      
      // Nessun dato da memorizzare
      if (data === undefined || data === null) {
        return data;
      }
      
      // Calcola il TTL in base al tipo o utilizza quello fornito
      let ttl = options?.ttlMs;
      if (!ttl && options?.keyType) {
        ttl = this.getTtlForType(options.keyType);
      } else if (!ttl) {
        ttl = this.TTL.DEFAULT;
      }
      
      // Memorizza con tag opzionali
      this.set(key, data, ttl, options?.tags);
      
      return data;
    } catch (error) {
      // Non memorizzare errori in cache
      console.error(`Cache error for key ${key}:`, error);
      throw error;
    }
  }
}

// Esporta un'istanza singleton della cache
export const cache = new MemoryCache();