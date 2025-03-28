import { Link, useLocation } from "wouter";
import {
  Calendar,
  Users,
  MessageSquare,
  Sparkles
} from "lucide-react";

export default function NavigationTabs() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white border-b border-neutral-light overflow-x-auto">
      <div className="flex">
        <Link href="/">
          <a className={`nav-item flex-1 py-4 px-4 font-medium text-center focus:outline-none ${
            isActive("/") ? "active text-primary border-b-3 border-accent" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <Calendar className="h-5 w-5 mb-1" />
              <span>Appuntamenti</span>
            </div>
          </a>
        </Link>
        
        <Link href="/clients">
          <a className={`nav-item flex-1 py-4 px-4 font-medium text-center focus:outline-none ${
            isActive("/clients") ? "active text-primary border-b-3 border-accent" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <Users className="h-5 w-5 mb-1" />
              <span>Clienti</span>
            </div>
          </a>
        </Link>
        
        <Link href="/chat">
          <a className={`nav-item flex-1 py-4 px-4 font-medium text-center focus:outline-none ${
            isActive("/chat") ? "active text-primary border-b-3 border-accent" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <MessageSquare className="h-5 w-5 mb-1" />
              <span>Chat</span>
            </div>
          </a>
        </Link>
        
        <Link href="/services">
          <a className={`nav-item flex-1 py-4 px-4 font-medium text-center focus:outline-none ${
            isActive("/services") ? "active text-primary border-b-3 border-accent" : "text-neutral-dark"
          }`}>
            <div className="flex flex-col items-center">
              <Sparkles className="h-5 w-5 mb-1" />
              <span>Servizi</span>
            </div>
          </a>
        </Link>
      </div>
    </nav>
  );
}
