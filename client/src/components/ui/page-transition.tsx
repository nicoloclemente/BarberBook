import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type TransitionState = "entering" | "entered" | "exiting" | "exited";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  transitionDuration?: number;
}

export function PageTransition({ 
  children, 
  className,
  transitionDuration = 300 
}: PageTransitionProps) {
  const [location] = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionState, setTransitionState] = useState<TransitionState>("entered");
  const [content, setContent] = useState(children);

  useEffect(() => {
    if (location !== displayLocation) {
      // Inizia transizione in uscita
      setTransitionState("exiting");
      
      // Attendi che la transizione in uscita sia completata
      const timeoutId = setTimeout(() => {
        setTransitionState("exited");
        setDisplayLocation(location);
        setContent(children);
        
        // Inizia transizione in entrata
        requestAnimationFrame(() => {
          setTransitionState("entering");
          
          // Completa transizione in entrata
          setTimeout(() => {
            setTransitionState("entered");
          }, transitionDuration);
        });
      }, transitionDuration);
      
      return () => clearTimeout(timeoutId);
    }
  }, [location, displayLocation, children, transitionDuration]);

  return (
    <div
      className={cn(
        "transition-all duration-300 w-full",
        transitionState === "entering" && "opacity-0 transform translate-y-2",
        transitionState === "entered" && "opacity-100 transform translate-y-0",
        transitionState === "exiting" && "opacity-0 transform -translate-y-2",
        className
      )}
    >
      {content}
    </div>
  );
}