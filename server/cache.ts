/**
 * Un modulo semplice per la memorizzazione nella cache delle query frequenti
 * per ridurre il carico sul database e diminuire il consumo di memoria.
 */

type CacheItem<T> = {
  data: T;
  expiry: number;
};

class MemoryCache {
  private cache: Map<string, CacheItem<any>>;
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minuti di default

  constructor() {
    this.cache = new Map();
    
    // Pianifica la pulizia periodica della cache ogni 10 minuti
    setInterval(() => this.cleanExpiredItems(), 10 * 60 * 1000);
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
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
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
   * @param ttlMs Durata in millisecondi (opzionale, default 5 minuti)
   * @returns I dati dalla cache o dalla funzione fetchFn
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlMs: number = this.DEFAULT_TTL_MS
  ): Promise<T> {
    const cachedItem = this.get<T>(key);
    
    if (cachedItem !== undefined) {
      return cachedItem;
    }
    
    // Recupera i dati e memorizzali nella cache
    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }
}

// Esporta un'istanza singleton della cache
export const cache = new MemoryCache();