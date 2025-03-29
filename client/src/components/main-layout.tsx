import { ReactNode, useState } from "react";
import NavigationTabs from "./navigation-tabs";
import MobileNavigation from "./mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { ProfileImage } from "@/components/ui/profile-image";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut } from "lucide-react";
import { NotificationCenter } from "@/components/ui/notification-center";
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

  const handleLogout = async () => {
    setIsLogoutPending(true);
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setIsLogoutPending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Scissors className="h-8 w-8 text-accent" />
            <h1 className="font-heading font-bold text-xl">BarberBook</h1>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <ProfileImage user={user} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isLogoutPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>

      {/* Navigation tabs for desktop */}
      <NavigationTabs />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}
