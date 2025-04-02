import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  
  try {
    return await res.json();
  } catch (e) {
    console.error("Error parsing JSON response:", e);
    return {} as T;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
