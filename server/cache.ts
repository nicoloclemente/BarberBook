/**
 * Un modulo ottimizzato per la memorizzazione nella cache delle query frequenti
 * per ridurre il carico sul database e diminuire il consumo di memoria.
 * Implementa TTL variabili basati sul tipo di dato e invalidazione selettiva.
 */

type CacheItem<T> = {
  data: T;
  expiry: number;
  tags?: string[]; // Tag per identificare gruppi di elementi correlati
};

class MemoryCache {
  private cache: Map<string, CacheItem<any>>;
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minuti di default
  private readonly USER_TTL_MS = 10 * 60 * 1000; // 10 minuti per dati utente
  private readonly WORKING_HOURS_TTL_MS = 30 * 60 * 1000; // 30 minuti per orari di lavoro
  private readonly APPOINTMENTS_TTL_MS = 2 * 60 * 1000; // 2 minuti per appuntamenti (aggiornati frequentemente)

  constructor() {
    this.cache = new Map();
    
    // Pianifica la pulizia periodica della cache ogni 10 minuti
    setInterval(() => this.cleanExpiredItems(), 10 * 60 * 1000);
    
    // Log di debug per monitorare la dimensione della cache
    setInterval(() => {
      console.log(`Cache size: ${this.cache.size} items`);
    }, 15 * 60 * 1000); // ogni 15 minuti
  }

  /**
   * Ottiene un elemento dalla cache
   * @param key Chiave dell'elemento
   * @returns L'elemento memorizzato, o undefined se non presente o scaduto
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Se l'elemento non esiste o è scaduto
    if (!item || item.expiry < Date.now()) {
      if (item) this.cache.delete(key); // Rimuovi l'elemento scaduto
      return undefined;
    }
    
    return item.data;
  }

  /**
   * Memorizza un elemento nella cache
   * @param key Chiave dell'elemento
   * @param data Dati da memorizzare
   * @param ttlMs Durata in millisecondi (opzionale, default 5 minuti)
   * @param tags Array di tag per raggruppare elementi correlati
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS, tags?: string[]): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry, tags });
  }
  
  /**
   * Invalida elementi nella cache in base al tag
   * @param tag Il tag degli elementi da invalidare
   * @returns Il numero di elementi invalidati
   */
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.tags && item.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
  
  /**
   * Determina il TTL appropriato in base al tipo di dati
   * @param keyType Il tipo di dati da memorizzare
   * @returns Durata TTL in millisecondi
   */
  getTtlForType(keyType: 'user' | 'working-hours' | 'appointment' | 'default'): number {
    switch (keyType) {
      case 'user':
        return this.USER_TTL_MS;
      case 'working-hours':
        return this.WORKING_HOURS_TTL_MS;
      case 'appointment':
        return this.APPOINTMENTS_TTL_MS;
      default:
        return this.DEFAULT_TTL_MS;
    }
  }

  /**
   * Rimuove un elemento dalla cache
   * @param key Chiave dell'elemento da rimuovere
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Rimuove tutti gli elementi dalla cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Rimuove tutti gli elementi scaduti dalla cache
   */
  cleanExpiredItems(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.cache.delete(key);
      }
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
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: {
      ttlMs?: number;
      keyType?: 'user' | 'working-hours' | 'appointment' | 'default';
      tags?: string[];
    }
  ): Promise<T> {
    const cachedItem = this.get<T>(key);
    
    if (cachedItem !== undefined) {
      return cachedItem;
    }
    
    // Recupera i dati e memorizzali nella cache
    const data = await fetchFn();
    
    // Calcola il TTL in base al tipo
    let ttl = options?.ttlMs;
    if (!ttl && options?.keyType) {
      ttl = this.getTtlForType(options.keyType);
    } else if (!ttl) {
      ttl = this.DEFAULT_TTL_MS;
    }
    
    // Memorizza con tag opzionali
    this.set(key, data, ttl, options?.tags);
    
    return data;
  }
}

// Esporta un'istanza singleton della cache
export const cache = new MemoryCache();