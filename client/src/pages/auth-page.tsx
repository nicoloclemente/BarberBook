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
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Hero section */}
      <div className="bg-primary text-white p-8 flex flex-col justify-center lg:w-1/2">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center space-x-3 mb-8">
            <Scissors className="h-10 w-10" />
            <h1 className="text-3xl font-bold">BarberBook</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4">Gestisci il tuo salone da barbiere in modo efficiente</h2>
          <p className="text-lg opacity-80 mb-6">
            Prenota appuntamenti, gestisci clienti, organizza il tuo calendario e comunica facilmente con i tuoi clienti.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-bold text-xl mb-2">Per Barbieri</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Gestione calendario
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Inserimento clienti
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Chat con i clienti
                </li>
              </ul>
            </div>
            <div className="bg-primary-foreground/10 p-4 rounded-lg">
              <h3 className="font-bold text-xl mb-2">Per Clienti</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Prenotazione semplice
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Notifiche appuntamenti
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Comunicazione diretta
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Auth forms */}
      <div className="flex items-center justify-center p-8 lg:w-1/2">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Benvenuto su BarberBook</CardTitle>
            <CardDescription className="text-center">
              Accedi o registrati per iniziare a usare l'applicazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="register">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Inserisci il tuo username" 
                              {...field}
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Password" 
                              {...field}
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
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
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Inserisci il tuo nome completo" 
                              {...field}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Crea un username" 
                              {...field}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Numero di telefono (opzionale)" 
                              {...field}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Inserisci il numero per essere contattato
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Crea una password" 
                              {...field}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conferma Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Conferma la password" 
                              {...field}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="isBarber"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Sono un barbiere</FormLabel>
                            <FormDescription>
                              Seleziona questa opzione se vuoi gestire un salone
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
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
          <CardFooter className="flex justify-center">
            <p className="text-sm text-center text-gray-500">
              {activeTab === "login" ? (
                <>
                  Non hai un account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setActiveTab("register")}
                  >
                    Registrati
                  </Button>
                </>
              ) : (
                <>
                  Hai già un account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setActiveTab("login")}
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
