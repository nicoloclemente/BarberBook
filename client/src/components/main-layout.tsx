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
      {/* Header */}
      <header 
        className={`sticky top-0 z-30 border-b transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 cursor-pointer transition-transform duration-300 hover:scale-105" 
                onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shadow-sm">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <h1 className="font-semibold text-lg tracking-tight text-gradient">BarberBook</h1>
              </div>
              
              {!isMobile && (
                <div className="ml-6 text-sm font-medium text-muted-foreground py-1 px-3 rounded-md bg-gray-50 border border-gray-100">
                  {getPageTitle()}
                </div>
              )}
            </div>
            
            {!isMobile && (
              <div className="flex-1 max-w-md mx-8 relative">
                <div className={`flex items-center rounded-lg border border-gray-200 px-3 ${searchFocused ? 'ring-2 ring-primary/20 border-primary/50' : 'hover:border-gray-300'} transition-all duration-200 bg-gray-50/80`}>
                  <Search className="h-4 w-4 text-muted-foreground mr-2" />
                  <Input 
                    type="text" 
                    placeholder="Cerca..." 
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 py-2"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <NotificationCenter />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/80 transition-colors duration-200">
                    <ProfileImage user={user} />
                    {!isMobile && (
                      <>
                        <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl p-1 shadow-elegant" align="end">
                  <DropdownMenuLabel className="font-normal rounded-lg px-3 py-2 hover:bg-muted/50">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
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
