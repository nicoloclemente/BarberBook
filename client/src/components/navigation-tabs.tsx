import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Users,
  MessageSquare,
  Sparkles,
  BarChart
} from "lucide-react";

export default function NavigationTabs() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white border-b border-neutral-200 shadow-sm overflow-x-auto">
      <div className="flex justify-around">
        <div className={`nav-item py-4 px-6 font-medium text-center ${
          isActive("/") ? "active" : "text-neutral-700 hover:text-primary transition-colors"
        }`}>
          <Link href="/">
            <div className="flex flex-col items-center cursor-pointer">
              <Calendar className="h-5 w-5 mb-1" />
              <span>Appuntamenti</span>
            </div>
          </Link>
        </div>
        
        <div className={`nav-item py-4 px-6 font-medium text-center ${
          isActive("/clients") ? "active" : "text-neutral-700 hover:text-primary transition-colors"
        }`}>
          <Link href="/clients">
            <div className="flex flex-col items-center cursor-pointer">
              <Users className="h-5 w-5 mb-1" />
              <span>Clienti</span>
            </div>
          </Link>
        </div>
        
        <div className={`nav-item py-4 px-6 font-medium text-center ${
          isActive("/chat") ? "active" : "text-neutral-700 hover:text-primary transition-colors"
        }`}>
          <Link href="/chat">
            <div className="flex flex-col items-center cursor-pointer">
              <MessageSquare className="h-5 w-5 mb-1" />
              <span>Chat</span>
            </div>
          </Link>
        </div>
        
        <div className={`nav-item py-4 px-6 font-medium text-center ${
          isActive("/services") ? "active" : "text-neutral-700 hover:text-primary transition-colors"
        }`}>
          <Link href="/services">
            <div className="flex flex-col items-center cursor-pointer">
              <Sparkles className="h-5 w-5 mb-1" />
              <span>Servizi</span>
            </div>
          </Link>
        </div>
        
        {user?.isBarber && (
          <div className={`nav-item py-4 px-6 font-medium text-center ${
            isActive("/statistics") ? "active" : "text-neutral-700 hover:text-primary transition-colors"
          }`}>
            <Link href="/statistics">
              <div className="flex flex-col items-center cursor-pointer">
                <BarChart className="h-5 w-5 mb-1" />
                <span>Statistiche</span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
