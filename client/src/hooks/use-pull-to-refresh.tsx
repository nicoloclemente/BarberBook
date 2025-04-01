import { useState, useEffect, useRef, useCallback } from 'react';
import { hapticFeedback } from '@/lib/utils';

interface PullToRefreshOptions {
  pullDownThreshold?: number;
  maxPullDownDistance?: number;
  refreshingDuration?: number;
  onRefresh?: () => Promise<any> | void;
}

interface PullToRefreshResult {
  containerProps: {
    ref: React.RefObject<HTMLDivElement>;
  };
  indicatorProps: React.HTMLAttributes<HTMLDivElement>;
  isRefreshing: boolean;
  pullProgress: number;
  refresh: () => void;
}

/**
 * Hook che implementa il comportamento Pull-to-Refresh simile a quello delle app native
 * @param options Opzioni di configurazione
 * @returns Props e stato del pull-to-refresh
 */
export function usePullToRefresh(options: PullToRefreshOptions = {}): PullToRefreshResult {
  const {
    pullDownThreshold = 80,
    maxPullDownDistance = 120,
    refreshingDuration = 2000,
    onRefresh = () => Promise.resolve(),
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const currentPullDistance = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [pullProgress, setPullProgress] = useState<number>(0);

  // Funzione di refresh che può essere chiamata programmaticamente
  const refresh = useCallback(async () => {
    // Feedback tattile per l'inizio del refresh
    hapticFeedback('success');
    
    // Imposta lo stato di caricamento
    setIsRefreshing(true);
    
    try {
      // Esegui il callback di refresh fornito
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      // Feedback tattile per la fine del refresh
      hapticFeedback('light');
      
      // Dopo un certo periodo, ripristina lo stato
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        currentPullDistance.current = 0;
      }, refreshingDuration);
    }
  }, [onRefresh, refreshingDuration]);

  // Effetto per gestire gli eventi touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Registra solo se siamo all'inizio della pagina
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartY.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null || isRefreshing) return;
      
      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;
      
      // Pull down è consentito solo se stiamo scorrendo verso il basso
      if (diff > 0) {
        // Aggiungi resistenza: maggiore è la distanza, maggiore è la resistenza
        const pullResistance = 0.5 * Math.exp(-diff / 400);
        const pull = Math.min(diff * pullResistance, maxPullDownDistance);
        
        currentPullDistance.current = pull;
        setPullDistance(pull);
        setPullProgress(Math.min(1, pull / pullDownThreshold));
        
        // Previeni lo scroll predefinito se stiamo tirando verso il basso
        if (diff > 5) e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (touchStartY.current === null || isRefreshing) return;
      
      if (currentPullDistance.current >= pullDownThreshold) {
        refresh();
      } else {
        // Riporta l'indicatore a 0
        setPullDistance(0);
        currentPullDistance.current = 0;
      }
      
      touchStartY.current = null;
    };

    // Aggiungi event listener
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, maxPullDownDistance, pullDownThreshold, refresh]);

  // Props per il container
  const containerProps = {
    ref: containerRef,
  };

  // Props per l'indicatore
  const indicatorProps = {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: isRefreshing ? '60px' : `${pullDistance}px`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      transition: isRefreshing ? 'height 0.2s ease-out' : 'none',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 10
    } as React.CSSProperties,
  };

  return {
    containerProps,
    indicatorProps,
    isRefreshing,
    pullProgress,
    refresh,
  };
}