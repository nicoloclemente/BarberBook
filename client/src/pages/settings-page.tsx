import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole } from "@shared/schema";
import { Loader2, Save, Bell, Languages, Shield, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Impostazioni di notifica (esempio)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [appNotifications, setAppNotifications] = useState(true);
  const [reminderTime, setReminderTime] = useState("24");
  
  // Impostazioni di aspetto
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("it");

  // Gestione salvataggio (da implementare con API)
  const handleSaveNotifications = () => {
    setIsUpdating(true);
    
    // Simulazione chiamata API
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Impostazioni salvate",
        description: "Le tue preferenze di notifica sono state aggiornate.",
      });
    }, 1000);
  };

  const handleSaveAppearance = () => {
    setIsUpdating(true);
    
    // Simulazione chiamata API
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Impostazioni salvate",
        description: "Le tue preferenze di aspetto sono state aggiornate.",
      });
    }, 1000);
  };

  const handleSavePrivacy = () => {
    setIsUpdating(true);
    
    // Simulazione chiamata API
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Impostazioni salvate",
        description: "Le tue preferenze di privacy sono state aggiornate.",
      });
    }, 1000);
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const isBarber = user?.isBarber || user?.role === UserRole.BARBER;

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Impostazioni</h1>
            <p className="text-muted-foreground">Personalizza la tua esperienza nell'applicazione</p>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="w-full space-y-4">
          <TabsList className="mb-6 rounded-lg bg-gradient-to-r from-muted/60 to-muted/30 p-1">
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Sun className="h-4 w-4 mr-2" />
              Aspetto
            </TabsTrigger>
            {isBarber && (
              <TabsTrigger value="privacy">
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="notifications">
            <Card className="shadow-elegant border-0">
              <CardHeader className="bg-primary/5 rounded-t-xl">
                <CardTitle className="text-gradient">Preferenze di Notifica</CardTitle>
                <CardDescription>
                  Gestisci come e quando ricevere notifiche dall'applicazione
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications" className="font-medium">Notifiche Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Ricevi aggiornamenti importanti via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app-notifications" className="font-medium">Notifiche App</Label>
                      <p className="text-sm text-muted-foreground">
                        Ricevi notifiche all'interno dell'applicazione
                      </p>
                    </div>
                    <Switch
                      id="app-notifications"
                      checked={appNotifications}
                      onCheckedChange={setAppNotifications}
                    />
                  </div>
                  
                  {(isBarber || isAdmin) && (
                    <div className="space-y-2">
                      <Label htmlFor="reminder-time" className="font-medium">Promemoria Appuntamenti</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Quanto tempo prima di un appuntamento desideri ricevere un promemoria
                      </p>
                      <Select value={reminderTime} onValueChange={setReminderTime}>
                        <SelectTrigger id="reminder-time" className="w-full md:w-[250px]">
                          <SelectValue placeholder="Seleziona un intervallo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Intervallo di tempo</SelectLabel>
                            <SelectItem value="24">24 ore prima</SelectItem>
                            <SelectItem value="12">12 ore prima</SelectItem>
                            <SelectItem value="6">6 ore prima</SelectItem>
                            <SelectItem value="2">2 ore prima</SelectItem>
                            <SelectItem value="1">1 ora prima</SelectItem>
                            <SelectItem value="0">Disabilita promemoria</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-8">
                  <Button 
                    type="button" 
                    onClick={handleSaveNotifications}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salva Modifiche
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="shadow-elegant border-0">
              <CardHeader className="bg-primary/5 rounded-t-xl">
                <CardTitle className="text-gradient">Aspetto</CardTitle>
                <CardDescription>
                  Personalizza l'aspetto dell'applicazione
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme" className="font-medium">Tema</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Scegli il tema dell'applicazione
                    </p>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger id="theme" className="w-full md:w-[250px]">
                        <SelectValue placeholder="Seleziona un tema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Temi</SelectLabel>
                          <SelectItem value="light">
                            <div className="flex items-center">
                              <Sun className="h-4 w-4 mr-2" />
                              Chiaro
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center">
                              <Moon className="h-4 w-4 mr-2" />
                              Scuro
                            </div>
                          </SelectItem>
                          <SelectItem value="system">Sistema (automatico)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="font-medium">Lingua</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Scegli la lingua dell'applicazione
                    </p>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language" className="w-full md:w-[250px]">
                        <SelectValue placeholder="Seleziona una lingua" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Lingue</SelectLabel>
                          <SelectItem value="it">
                            <div className="flex items-center">
                              <Languages className="h-4 w-4 mr-2" />
                              Italiano
                            </div>
                          </SelectItem>
                          <SelectItem value="en">
                            <div className="flex items-center">
                              <Languages className="h-4 w-4 mr-2" />
                              English
                            </div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button 
                    type="button" 
                    onClick={handleSaveAppearance}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salva Modifiche
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isBarber && (
            <TabsContent value="privacy">
              <Card className="shadow-elegant border-0">
                <CardHeader className="bg-primary/5 rounded-t-xl">
                  <CardTitle className="text-gradient">Privacy e Visibilità</CardTitle>
                  <CardDescription>
                    Gestisci chi può vedere il tuo profilo e le tue informazioni
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="public-profile" className="font-medium">Profilo Pubblico</Label>
                        <p className="text-sm text-muted-foreground">
                          Rendi il tuo profilo visibile nella directory pubblica dei barbieri
                        </p>
                      </div>
                      <Switch
                        id="public-profile"
                        defaultChecked={true}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-reviews" className="font-medium">Mostra Recensioni</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostra le recensioni dei clienti sul tuo profilo
                        </p>
                      </div>
                      <Switch
                        id="show-reviews"
                        defaultChecked={true}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-availability" className="font-medium">Mostra Disponibilità</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostra la tua disponibilità di orari ai clienti non registrati
                        </p>
                      </div>
                      <Switch
                        id="show-availability"
                        defaultChecked={true}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <Button 
                      type="button" 
                      onClick={handleSavePrivacy}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salva Modifiche
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}