import { ReactNode, useState, useEffect } from "react";
import NavigationTabs from "./navigation-tabs";
import MobileNavigation from "./mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { ProfileImage } from "@/components/ui/profile-image";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut, Settings, User, ChevronDown } from "lucide-react";
import { NotificationCenter } from "@/components/ui/notification-center";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import useMobile from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [location, navigate] = useLocation();
  const isMobile = useMobile();
  const [scrolled, setScrolled] = useState(false);

  // Effetto di scrolling per l'header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Gestione logout
  const handleLogout = async () => {
    setIsLogoutPending(true);
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setIsLogoutPending(false);
    }
  };

  // Determina il titolo della pagina basato sul percorso corrente
  const getPageTitle = () => {
    if (location.includes('/dashboard')) return 'Dashboard';
    if (location.includes('/services')) return 'Servizi';
    if (location.includes('/profile')) return 'Profilo';
    if (location.includes('/admin')) return 'Pannello Admin';
    if (location.includes('/chat')) return 'Chat';
    if (location.includes('/appointments')) return 'Appuntamenti';
    if (location.includes('/clients')) return 'Clienti';
    if (location.includes('/statistics')) return 'Statistiche';
    if (location.includes('/notifications')) return 'Notifiche';
    return 'BarberBook';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/40">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">BarberBook</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestione barbieri professionale</p>
          </div>
          <Separator className="my-4" />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header 
        className={`sticky top-0 z-30 border-b transition-all duration-200 ${
          scrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-background"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <h1 className="font-semibold text-lg tracking-tight">BarberBook</h1>
              </div>
              
              {!isMobile && (
                <div className="ml-6 text-sm font-medium text-muted-foreground">
                  {getPageTitle()}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationCenter />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/60">
                    <ProfileImage user={user} />
                    {!isMobile && (
                      <>
                        <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profilo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Impostazioni</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLogoutPending}
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation tabs for desktop */}
        {!isMobile && <NavigationTabs />}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto py-6 px-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile navigation */}
      {isMobile && <MobileNavigation />}
    </div>
  );
}
