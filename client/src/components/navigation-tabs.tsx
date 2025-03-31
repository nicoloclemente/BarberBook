import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Users,
  MessageSquare,
  Sparkles,
  BarChart,
  UserCog,
  ShieldCheck,
  Bell,
  Home,
  LayoutDashboard,
  Settings,
  ListTodo,
  PanelLeft,
  Scissors
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  badge?: number;
  tooltip?: string;
  onClick?: () => void;
}

function NavItem({ icon, label, href, isActive, badge, tooltip, onClick }: NavItemProps) {
  const content = (
    <Link href={href}>
      <div
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          isActive ? "bg-accent text-accent-foreground" : "transparent"
        )}
        onClick={onClick}
      >
        <div className="flex h-6 w-6 items-center justify-center">
          {icon}
        </div>
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge
            variant="secondary"
            className="ml-auto h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-[10px]"
          >
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </div>
    </Link>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

function NavSection({ title, children }: NavSectionProps) {
  return (
    <div className="px-3 py-2">
      <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface NavigationTabsProps {
  orientation?: "vertical" | "horizontal";
  onItemClick?: () => void;
}

export default function NavigationTabs({ orientation = "vertical", onItemClick }: NavigationTabsProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

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

  // Handle item click if provided
  const handleItemClick = () => {
    if (onItemClick) onItemClick();
  };

  if (orientation === "horizontal") {
    // Navigazione orizzontale (mobile/tablet)
    return (
      <nav className="flex h-12 items-center overflow-x-auto bg-background px-4 md:h-14">
        <div className="flex gap-4">
          {isAdmin ? (
            <>
              <NavItem
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                href="/admin/dashboard"
                isActive={isActive("/admin/dashboard") || isActive("/")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Admin"
                href="/admin"
                isActive={isActive("/admin") && !isActive("/admin/dashboard") && !isActive("/admin/notifications") && !isActive("/admin/statistics")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Bell className="h-4 w-4" />}
                label="Notifiche"
                href="/admin/notifications"
                isActive={isActive("/admin/notifications")}
                badge={unreadCount}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<BarChart className="h-4 w-4" />}
                label="Statistiche"
                href="/admin/statistics"
                isActive={isActive("/admin/statistics")}
                onClick={handleItemClick}
              />
            </>
          ) : isBarber ? (
            <>
              <NavItem
                icon={<Calendar className="h-4 w-4" />}
                label="Appuntamenti"
                href="/dashboard"
                isActive={isActive("/dashboard") || isActive("/")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Users className="h-4 w-4" />}
                label="Clienti"
                href="/clients"
                isActive={isActive("/clients")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<MessageSquare className="h-4 w-4" />}
                label="Chat"
                href="/chat"
                isActive={isActive("/chat")}
                badge={unreadCount}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Sparkles className="h-4 w-4" />}
                label="Servizi"
                href="/services"
                isActive={isActive("/services")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<BarChart className="h-4 w-4" />}
                label="Statistiche"
                href="/statistics"
                isActive={isActive("/statistics")}
                onClick={handleItemClick}
              />
            </>
          ) : (
            <>
              <NavItem
                icon={<Home className="h-4 w-4" />}
                label="Home"
                href="/"
                isActive={isActive("/")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Calendar className="h-4 w-4" />}
                label="Appuntamenti"
                href="/appointments"
                isActive={isActive("/appointments")}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<MessageSquare className="h-4 w-4" />}
                label="Chat"
                href="/chat"
                isActive={isActive("/chat")}
                badge={unreadCount}
                onClick={handleItemClick}
              />
            </>
          )}
          <NavItem
            icon={<UserCog className="h-4 w-4" />}
            label="Profilo"
            href="/profile"
            isActive={isActive("/profile")}
            onClick={handleItemClick}
          />
        </div>
      </nav>
    );
  }

  // Navigazione verticale (desktop sidebar)
  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r bg-card",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Scissors className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && <h1 className="font-semibold text-lg tracking-tight">BarberBook</h1>}
        </div>
        {!collapsed && (
          <button
            className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        {collapsed && (
          <button
            className="absolute right-0 top-3 h-8 w-5 rounded-l-md bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeft className="h-3 w-3 rotate-180" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto py-2">
        {isAdmin ? (
          // Navigazione Admin
          <>
            <NavSection title={collapsed ? "" : "Amministrazione"}>
              <NavItem
                icon={<ShieldCheck className="h-5 w-5" />}
                label={collapsed ? "" : "Gestione"}
                href="/admin"
                isActive={isActive("/admin") || isActive("/")}
                tooltip={collapsed ? "Gestione" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Bell className="h-5 w-5" />}
                label={collapsed ? "" : "Notifiche"}
                href="/admin/notifications"
                isActive={isActive("/admin/notifications")}
                badge={unreadCount}
                tooltip={collapsed ? "Notifiche" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<BarChart className="h-5 w-5" />}
                label={collapsed ? "" : "Statistiche Avanzate"}
                href="/admin/statistics"
                isActive={isActive("/admin/statistics")}
                tooltip={collapsed ? "Statistiche Avanzate" : undefined}
                onClick={handleItemClick}
              />
            </NavSection>
          </>
        ) : isBarber ? (
          // Navigazione Barbieri
          <>
            <NavSection title={collapsed ? "" : "Agenda"}>
              <NavItem
                icon={<Calendar className="h-5 w-5" />}
                label={collapsed ? "" : "Appuntamenti"}
                href="/dashboard"
                isActive={isActive("/dashboard") || isActive("/")}
                tooltip={collapsed ? "Appuntamenti" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<ListTodo className="h-5 w-5" />}
                label={collapsed ? "" : "Giornaliero"}
                href="/daily"
                isActive={isActive("/daily")}
                tooltip={collapsed ? "Giornaliero" : undefined}
                onClick={handleItemClick}
              />
            </NavSection>

            <Separator className={cn("my-4", collapsed && "mx-2")} />

            <NavSection title={collapsed ? "" : "Gestione"}>
              <NavItem
                icon={<Users className="h-5 w-5" />}
                label={collapsed ? "" : "Clienti"}
                href="/clients"
                isActive={isActive("/clients")}
                tooltip={collapsed ? "Clienti" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Sparkles className="h-5 w-5" />}
                label={collapsed ? "" : "Servizi"}
                href="/services"
                isActive={isActive("/services")}
                tooltip={collapsed ? "Servizi" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<BarChart className="h-5 w-5" />}
                label={collapsed ? "" : "Statistiche"}
                href="/statistics"
                isActive={isActive("/statistics")}
                tooltip={collapsed ? "Statistiche" : undefined}
                onClick={handleItemClick}
              />
            </NavSection>

            <Separator className={cn("my-4", collapsed && "mx-2")} />

            <NavSection title={collapsed ? "" : "Comunicazioni"}>
              <NavItem
                icon={<MessageSquare className="h-5 w-5" />}
                label={collapsed ? "" : "Chat"}
                href="/chat"
                isActive={isActive("/chat")}
                badge={unreadCount}
                tooltip={collapsed ? "Chat" : undefined}
                onClick={handleItemClick}
              />
            </NavSection>
          </>
        ) : (
          // Navigazione Clienti
          <>
            <NavSection title={collapsed ? "" : "Menu"}>
              <NavItem
                icon={<Home className="h-5 w-5" />}
                label={collapsed ? "" : "Home"}
                href="/"
                isActive={isActive("/")}
                tooltip={collapsed ? "Home" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<Calendar className="h-5 w-5" />}
                label={collapsed ? "" : "Appuntamenti"}
                href="/appointments"
                isActive={isActive("/appointments")}
                tooltip={collapsed ? "Appuntamenti" : undefined}
                onClick={handleItemClick}
              />
              <NavItem
                icon={<MessageSquare className="h-5 w-5" />}
                label={collapsed ? "" : "Chat"}
                href="/chat"
                isActive={isActive("/chat")}
                badge={unreadCount}
                tooltip={collapsed ? "Chat" : undefined}
                onClick={handleItemClick}
              />
            </NavSection>
          </>
        )}
      </div>

      <div className={cn("border-t p-3", collapsed && "flex justify-center")}>
        <NavItem
          icon={<UserCog className="h-5 w-5" />}
          label={collapsed ? "" : "Profilo"}
          href="/profile"
          isActive={isActive("/profile")}
          tooltip={collapsed ? "Profilo" : undefined}
          onClick={handleItemClick}
        />
      </div>
    </aside>
  );
}
