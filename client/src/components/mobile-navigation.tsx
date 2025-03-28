import { Link, useLocation } from "wouter";
import {
  Calendar,
  Users,
  MessageSquare,
  Sparkles
} from "lucide-react";

export default function MobileNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="md:hidden bg-white border-t border-neutral-light">
      <div className="flex justify-around">
        <Link href="/">
          <a className={`py-3 px-4 font-medium focus:outline-none ${
            isActive("/") ? "text-primary" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <Calendar className="h-6 w-6" />
              <span className="text-xs mt-1">Agenda</span>
            </div>
          </a>
        </Link>
        
        <Link href="/clients">
          <a className={`py-3 px-4 font-medium focus:outline-none ${
            isActive("/clients") ? "text-primary" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <Users className="h-6 w-6" />
              <span className="text-xs mt-1">Clienti</span>
            </div>
          </a>
        </Link>
        
        <Link href="/chat">
          <a className={`py-3 px-4 font-medium focus:outline-none ${
            isActive("/chat") ? "text-primary" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <MessageSquare className="h-6 w-6" />
              <span className="text-xs mt-1">Chat</span>
            </div>
          </a>
        </Link>
        
        <Link href="/services">
          <a className={`py-3 px-4 font-medium focus:outline-none ${
            isActive("/services") ? "text-primary" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <Sparkles className="h-6 w-6" />
              <span className="text-xs mt-1">Servizi</span>
            </div>
          </a>
        </Link>
      </div>
    </nav>
  );
}
