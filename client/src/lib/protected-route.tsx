import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import React, { useEffect, useState, Suspense, lazy } from "react";

// Componente di fallback per il caricamento
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Gestiamo il rendering condizionale in modo sicuro
  const shouldRender = !isLoading && user && !isRedirecting;
  
  useEffect(() => {
    // Per evitare problemi di memoria durante la navigazione
    let isMounted = true;
    
    const handleNavigation = async () => {
      if (!isLoading) {
        if (!user) {
          // L'utente non è autenticato, redirezioniamo
          if (isMounted) setIsRedirecting(true);
          setLocation("/auth");
        } else if (path === "/" && user.role === "admin") {
          // Reindirizza gli admin alla dashboard di amministrazione
          if (isMounted) setIsRedirecting(true);
          setLocation("/admin");
        }
      }
    };
    
    handleNavigation();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [isLoading, user, setLocation, path]);
  
  return (
    <Route path={path}>
      {isLoading || isRedirecting ? (
        <LoadingFallback />
      ) : user ? (
        <Suspense fallback={<LoadingFallback />}>
          <ErrorBoundary>
            <Component />
          </ErrorBoundary>
        </Suspense>
      ) : null}
    </Route>
  );
}

// Componente ErrorBoundary per gestire errori nel rendering
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Errore nel rendering del componente:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">Si è verificato un errore</h2>
          <p className="text-muted-foreground mb-4">
            Qualcosa è andato storto nel caricamento della pagina.
          </p>
          <button
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            Ricarica la pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
