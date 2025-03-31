import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Users,
  MessageSquare,
  Sparkles,
  UserCog,
  BarChart,
  ShieldCheck,
  Bell,
  Home,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "./ui/badge";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  badge?: number;
}

function NavItem({ icon, label, href, isActive, badge }: NavItemProps) {
  return (
    <Link href={href}>
      <div className="relative group">
        <div className={cn(
          "flex flex-col items-center p-2",
          isActive 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground"
        )}>
          <div className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full mb-1 transition-colors",
            isActive 
              ? "bg-primary/10 text-primary" 
              : "group-hover:bg-muted text-muted-foreground"
          )}>
            {icon}
            {badge !== undefined && badge > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-[10px]">
                {badge > 9 ? '9+' : badge}
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </div>
        
        {isActive && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  );
}

export default function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user?.role === 'admin';
  const isBarber = user?.isBarber || user?.role === 'barber';
  
  // Recupera il conteggio delle notifiche non lette
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const result = await apiRequest<{count: string}>('/api/notifications/unread/count');
          setUnreadCount(Number(result.count) || 0);
        } catch (error) {
          console.error('Errore nel recupero delle notifiche non lette:', error);
        }
      };
      
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path === "/dashboard" && location === "/dashboard") return true;
    if (path !== "/" && path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };
  
  // Navigazione mobile per l'amministratore
  if (isAdmin) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around h-16 px-2 bg-background border-t md:hidden">
        <NavItem 
          icon={<LayoutDashboard className="h-5 w-5" />} 
          label="Dashboard" 
          href="/admin/dashboard" 
          isActive={isActive("/admin/dashboard") || isActive("/")} 
        />
        
        <NavItem 
          icon={<ShieldCheck className="h-5 w-5" />} 
          label="Admin" 
          href="/admin" 
          isActive={isActive("/admin") && !isActive("/admin/dashboard") && !isActive("/admin/notifications")} 
        />
        
        <NavItem 
          icon={<Bell className="h-5 w-5" />} 
          label="Notifiche" 
          href="/admin/notifications" 
          isActive={isActive("/admin/notifications")}
          badge={unreadCount}
        />
        
        <NavItem 
          icon={<UserCog className="h-5 w-5" />} 
          label="Profilo" 
          href="/profile" 
          isActive={isActive("/profile")} 
        />
      </nav>
    );
  }

  // Navigazione mobile per i barbieri
  if (isBarber) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around h-16 px-2 bg-background border-t md:hidden">
        <NavItem 
          icon={<Calendar className="h-5 w-5" />} 
          label="Appuntamenti" 
          href="/dashboard" 
          isActive={isActive("/dashboard") || isActive("/")} 
        />
        
        <NavItem 
          icon={<Users className="h-5 w-5" />} 
          label="Clienti" 
          href="/clients" 
          isActive={isActive("/clients")} 
        />
        
        <NavItem 
          icon={<MessageSquare className="h-5 w-5" />} 
          label="Chat" 
          href="/chat" 
          isActive={isActive("/chat")}
          badge={unreadCount}
        />
        
        <NavItem 
          icon={<Sparkles className="h-5 w-5" />} 
          label="Servizi" 
          href="/services" 
          isActive={isActive("/services")} 
        />
        
        <NavItem 
          icon={<BarChart className="h-5 w-5" />} 
          label="Statistiche" 
          href="/statistics" 
          isActive={isActive("/statistics")} 
        />
      </nav>
    );
  }

  // Navigazione mobile per i clienti
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around h-16 px-2 bg-background border-t md:hidden">
      <NavItem 
        icon={<Home className="h-5 w-5" />} 
        label="Home" 
        href="/" 
        isActive={isActive("/")} 
      />
      
      <NavItem 
        icon={<Calendar className="h-5 w-5" />} 
        label="Appuntamenti" 
        href="/appointments" 
        isActive={isActive("/appointments")} 
      />
      
      <NavItem 
        icon={<MessageSquare className="h-5 w-5" />} 
        label="Chat" 
        href="/chat" 
        isActive={isActive("/chat")}
        badge={unreadCount}
      />
      
      <NavItem 
        icon={<UserCog className="h-5 w-5" />} 
        label="Profilo" 
        href="/profile" 
        isActive={isActive("/profile")} 
      />
    </nav>
  );
}
