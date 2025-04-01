import { useRef, useEffect, useState } from 'react';

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number;
  preventDefaultTouchmove?: boolean;
  swipeDistance?: number;
}

/**
 * Hook per rilevare i gesti swipe su qualsiasi elemento
 * @param handlers Funzioni da eseguire per ogni direzione di swipe
 * @param options Opzioni di configurazione
 * @returns Oggetto con riferimento da assegnare all'elemento e direzione swipe corrente
 */
export function useSwipe(
  handlers: SwipeHandlers = {}, 
  options: SwipeOptions = {}
) {
  const { 
    threshold = 50, 
    preventDefaultTouchmove = true,
    swipeDistance = 0
  } = options;
  
  const elementRef = useRef<HTMLElement>(null);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [distance, setDistance] = useState(0);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      setSwipeDirection(null);
      setDistance(0);
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      setSwipeDirection(null);
      setDistance(0);
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!startXRef.current || !startYRef.current) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = startXRef.current - currentX;
      const diffY = startYRef.current - currentY;
      
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      
      // Previeni scroll predefinito se stiamo rilevando uno swipe orizzontale
      if (preventDefaultTouchmove && absX > absY && absX > 10) {
        e.preventDefault();
      }
      
      // Determina la distanza dello swipe per animazioni basate su essa
      if (absX > absY) {
        setDistance(diffX);
      } else {
        setDistance(diffY);
      }
      
      if (Math.max(absX, absY) < threshold) return;
      
      let direction: SwipeDirection = null;
      
      if (absX > absY) {
        direction = diffX > 0 ? 'left' : 'right';
      } else {
        direction = diffY > 0 ? 'up' : 'down';
      }
      
      setSwipeDirection(direction);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!startXRef.current || !startYRef.current) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      const diffX = startXRef.current - currentX;
      const diffY = startYRef.current - currentY;
      
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      
      // Determina la distanza dello swipe per animazioni basate su essa
      if (absX > absY) {
        setDistance(diffX);
      } else {
        setDistance(diffY);
      }
      
      if (Math.max(absX, absY) < threshold) return;
      
      let direction: SwipeDirection = null;
      
      if (absX > absY) {
        direction = diffX > 0 ? 'left' : 'right';
      } else {
        direction = diffY > 0 ? 'up' : 'down';
      }
      
      setSwipeDirection(direction);
    };
    
    const handleTouchEnd = () => {
      handleSwipeComplete();
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      handleSwipeComplete();
    };
    
    const handleSwipeComplete = () => {
      // Esegui la callback appropriata basata sulla direzione
      if (Math.abs(distance) < swipeDistance) {
        setSwipeDirection(null);
        setDistance(0);
        return;
      }
      
      if (swipeDirection === 'left' && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      } else if (swipeDirection === 'right' && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      } else if (swipeDirection === 'up' && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      } else if (swipeDirection === 'down' && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      }
      
      startXRef.current = 0;
      startYRef.current = 0;
      setSwipeDirection(null);
      setDistance(0);
    };
    
    // Aggiungi gli event listener
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmove });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('mousedown', handleMouseDown);
    
    // Pulisci gli event listener
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handlers, threshold, preventDefaultTouchmove, swipeDirection, distance, swipeDistance]);
  
  return { ref: elementRef, swipeDirection, distance };
}