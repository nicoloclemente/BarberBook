import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Users,
  MessageSquare,
  Sparkles,
  UserCog,
  BarChart
} from "lucide-react";

export default function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isBarber = user?.isBarber || user?.role === 'barber';
  const isClient = !isBarber && !isAdmin;

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="md:hidden bg-white border-t border-neutral-200 shadow-t">
      <div className="flex justify-around">
        <div className={`py-3 px-2 font-medium focus:outline-none ${
          isActive("/") ? "text-primary" : "text-neutral-700"
        }`}>
          <Link href="/">
            <div className="flex flex-col items-center cursor-pointer">
              <Calendar className="h-5 w-5" />
              <span className="text-xs mt-1">Agenda</span>
            </div>
          </Link>
        </div>
        
        {(isBarber || isAdmin) && (
          <div className={`py-3 px-2 font-medium focus:outline-none ${
            isActive("/clients") ? "text-primary" : "text-neutral-700"
          }`}>
            <Link href="/clients">
              <div className="flex flex-col items-center cursor-pointer">
                <Users className="h-5 w-5" />
                <span className="text-xs mt-1">Clienti</span>
              </div>
            </Link>
          </div>
        )}
        
        <div className={`py-3 px-2 font-medium focus:outline-none ${
          isActive("/chat") ? "text-primary" : "text-neutral-700"
        }`}>
          <Link href="/chat">
            <div className="flex flex-col items-center cursor-pointer">
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs mt-1">Chat</span>
            </div>
          </Link>
        </div>
        
        <div className={`py-3 px-2 font-medium focus:outline-none ${
          isActive("/services") ? "text-primary" : "text-neutral-700"
        }`}>
          <Link href="/services">
            <div className="flex flex-col items-center cursor-pointer">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs mt-1">Servizi</span>
            </div>
          </Link>
        </div>
        
        {isBarber && (
          <div className={`py-3 px-2 font-medium focus:outline-none ${
            isActive("/statistics") ? "text-primary" : "text-neutral-700"
          }`}>
            <Link href="/statistics">
              <div className="flex flex-col items-center cursor-pointer">
                <BarChart className="h-5 w-5" />
                <span className="text-xs mt-1">Stats</span>
              </div>
            </Link>
          </div>
        )}
        
        <div className={`py-3 px-2 font-medium focus:outline-none ${
          isActive("/profile") ? "text-primary" : "text-neutral-700"
        }`}>
          <Link href="/profile">
            <div className="flex flex-col items-center cursor-pointer">
              <UserCog className="h-5 w-5" />
              <span className="text-xs mt-1">Profilo</span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
