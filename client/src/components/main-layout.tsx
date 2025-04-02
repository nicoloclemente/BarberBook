import { ReactNode, useState, useEffect } from "react";
import NavigationTabs from "./navigation-tabs";
import MobileNavigation from "./mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { ProfileImage } from "@/components/ui/profile-image";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut, Settings, User, ChevronDown, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { PwaInstallBanner } from "@/components/ui/pwa-install-banner";
import { PushNotificationManager } from "@/components/ui/push-notification-manager";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [location, navigate] = useLocation();
  const isMobile = useMobile();
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

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
    if (location.includes('/barbers')) return 'Barbieri';
    if (location.includes('/daily')) return 'Agenda Giornaliera';
    return 'BarberBook';
  };

  // Se l'utente non è autenticato, mostriamo la pagina di login
  if (!user) {
    // Se è la pagina di login, renderizziamo il contenuto
    if (location === '/') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-slate-50 to-blue-50/20">
          <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-elegant scale-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-5 shadow-md">
                <Scissors className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gradient">BarberBook</h1>
              <p className="text-sm text-muted-foreground mt-2">Gestione barbieri professionale</p>
            </div>
            <Separator className="my-5" />
            {children}
          </div>
        </div>
      );
    }
    
    // Altrimenti reindirizziamo alla pagina di login
    navigate('/');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
        <div className="flex items-center flex-col gap-3">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
            <Scissors className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-2">Reindirizzamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - App bar style */}
      <header 
        className={`sticky top-0 z-30 transition-all duration-150 ${
          scrolled ? "bg-white/90 backdrop-blur-md shadow-[0_0.5px_2px_rgba(0,0,0,0.05)]" : "bg-white"
        }`}
      >
        <div className="px-3 md:px-5 max-w-full">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center gap-2 cursor-pointer transition-transform duration-150 active:scale-[0.98]" 
                onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
              >
                <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-primary/10">
                  <Scissors className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <h1 className="font-semibold text-base tracking-tight line-clamp-1 text-gray-800">BarberBook</h1>
              </div>
              
              {!isMobile && (
                <div className="ml-3 text-xs font-medium text-muted-foreground py-1 px-2.5 rounded-md bg-gray-50 border border-gray-100/80">
                  {getPageTitle()}
                </div>
              )}
            </div>
            
            {!isMobile && (
              <div className="flex-1 max-w-xs md:max-w-sm mx-4">
                <div className={`flex items-center rounded-full border border-gray-200 px-3 ${searchFocused ? 'ring-1 ring-primary/20 border-primary/50' : 'hover:border-gray-300'} transition-all duration-150 bg-gray-50/80`}>
                  <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                  <Input 
                    type="text" 
                    placeholder="Cerca..." 
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-8 py-2 text-sm"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1 md:gap-2">
              <NotificationCenter />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1.5 p-1.5 rounded-full hover:bg-muted/80 transition-colors duration-150">
                    <ProfileImage user={user} size="sm" />
                    {!isMobile && (
                      <>
                        <span className="text-xs font-medium line-clamp-1 max-w-[80px] text-gray-700">{user.name.split(' ')[0]}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.08)] p-1" align="end">
                  <DropdownMenuLabel className="font-normal rounded-lg px-3 py-2 hover:bg-muted/50">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-800">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile')}
                    className="rounded-lg px-3 py-2 cursor-pointer transition-colors"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profilo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/settings')}
                    className="rounded-lg px-3 py-2 cursor-pointer transition-colors"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Impostazioni</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLogoutPending}
                    className="text-red-600 rounded-lg px-3 py-2 cursor-pointer transition-colors"
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

        {/* Main content - Native app style */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-8 overscroll-none">
          <div className={isMobile ? "px-3 py-2" : "max-w-5xl mx-auto px-5 py-4"}>
            <div className="scale-in">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile navigation */}
      {isMobile && <MobileNavigation />}
      
      {/* PWA Install Banner */}
      <PwaInstallBanner />
      
      {/* Push Notification Manager */}
      <PushNotificationManager />
    </div>
  );
}
