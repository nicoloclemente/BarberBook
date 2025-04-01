import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, Scissors } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  isBarber: z.boolean().default(false),
  isManager: z.boolean().default(false),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { loginMutation, registerMutation, user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Previene il comportamento predefinito dei pulsanti nelle schede
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      phone: "",
      isBarber: false,
      isManager: false,
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero section */}
      <div className="bg-black text-white py-10 px-6 flex flex-col justify-center lg:w-1/2">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-white p-2.5 rounded-full">
              <Scissors className="h-7 w-7 text-black" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">BarberBook</h1>
          </div>
          <h2 className="text-4xl font-bold mb-8 leading-tight text-white">
            L'arte della barba e del taglio in formato digitale
          </h2>
          <p className="text-xl text-white mb-10 leading-relaxed">
            Una piattaforma elegante per gestire il tuo salone, prenotazioni e clienti con stile e professionalità.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className="bg-white p-6 rounded-lg hover:bg-white/95 transition-colors">
              <h3 className="font-bold text-xl mb-5 text-black">
                Per Barbieri
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="mr-2.5 text-black font-bold">—</span> 
                  <span className="text-black text-base">Gestione calendario</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2.5 text-black font-bold">—</span> 
                  <span className="text-black text-base">Inserimento clienti</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2.5 text-black font-bold">—</span> 
                  <span className="text-black text-base">Chat con i clienti</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg hover:bg-white/95 transition-colors">
              <h3 className="font-bold text-xl mb-5 text-black">
                Per Clienti
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="mr-2.5 text-black font-bold">—</span>
                  <span className="text-black text-base">Prenotazione semplice</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2.5 text-black font-bold">—</span>
                  <span className="text-black text-base">Notifiche appuntamenti</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2.5 text-black font-bold">—</span>
                  <span className="text-black text-base">Comunicazione diretta</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Auth forms */}
      <div className="flex items-center justify-center p-6 lg:p-8 lg:w-1/2 bg-white">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white">
          <CardHeader className="pb-3">
            <div className="flex justify-center mb-3">
              <div className="rounded-full bg-black p-2.5">
                <Scissors className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-black">Benvenuto</CardTitle>
            <CardDescription className="text-center text-gray-500 mt-2">
              Accedi o registrati per gestire il tuo salone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
                <TabsTrigger value="login" type="button" className="font-medium">Accedi</TabsTrigger>
                <TabsTrigger value="register" type="button" className="font-medium">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5 py-2">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Username</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                              placeholder="Inserisci il tuo username" 
                              {...field}
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                              type="password" 
                              placeholder="Inserisci la tua password" 
                              {...field}
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full mt-6 h-11 bg-black hover:bg-black/90 text-white font-medium text-[15px] transition-all" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Accedi
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Nome Completo</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                                placeholder="Il tuo nome completo" 
                                {...field}
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage className="text-xs font-medium" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Username</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                                placeholder="Crea un username" 
                                {...field}
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage className="text-xs font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Telefono</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                              placeholder="Numero di telefono (opzionale)" 
                              {...field}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription className="text-xs font-normal text-gray-500">
                            Inserisci il numero per essere contattato
                          </FormDescription>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                                type="password" 
                                placeholder="Crea una password" 
                                {...field}
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage className="text-xs font-medium" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Conferma Password</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-11 border-gray-200 bg-gray-50/50 focus:bg-white shadow-sm transition-all rounded-md"
                                type="password" 
                                placeholder="Conferma la password" 
                                {...field}
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage className="text-xs font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={registerForm.control}
                      name="isBarber"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 mt-2 bg-gray-50/50">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                // Se deseleziono barbiere, deseleziono anche manager
                                if (!checked) {
                                  registerForm.setValue("isManager", false);
                                }
                              }}
                              disabled={registerMutation.isPending}
                              className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium text-gray-700">Sono un barbiere</FormLabel>
                            <FormDescription className="text-xs font-normal text-gray-500">
                              Seleziona questa opzione se vuoi gestire un salone
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {registerForm.watch("isBarber") && (
                      <FormField
                        control={registerForm.control}
                        name="isManager"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 mt-2 bg-gray-50/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={registerMutation.isPending}
                                className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium text-gray-700">Sono un barbiere capo</FormLabel>
                              <FormDescription className="text-xs font-normal text-gray-500">
                                Seleziona questa opzione se gestisci altri barbieri nel tuo salone
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                    <Button 
                      type="submit" 
                      className="w-full mt-6 h-11 bg-black hover:bg-black/90 text-white font-medium text-[15px] transition-all" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Registrati
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center pt-3 pb-6">
            <p className="text-sm text-center text-gray-500">
              {activeTab === "login" ? (
                <>
                  Non hai un account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm font-medium text-black hover:text-black/80" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleTabChange("register");
                    }}
                  >
                    Registrati
                  </Button>
                </>
              ) : (
                <>
                  Hai già un account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm font-medium text-black hover:text-black/80" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleTabChange("login");
                    }}
                  >
                    Accedi
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
