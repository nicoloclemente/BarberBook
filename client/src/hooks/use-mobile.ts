import { useState, useEffect } from 'react';

/**
 * Hook che verifica se la viewport è di dimensioni mobile
 * @returns True se la viewport è mobile (< 768px), altrimenti false
 */
export default function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Aggiungi listener per ridimensionamento finestra
    window.addEventListener('resize', handleResize);
    
    // Rileva immediatamente lo stato
    handleResize();

    // Rimuovi il listener al cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}