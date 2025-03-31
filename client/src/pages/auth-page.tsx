import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  Loader2, 
  Scissors, 
  User, 
  Lock, 
  Phone, 
  Calendar, 
  MessageSquare, 
  Bell, 
  Clock, 
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(3, "Username deve essere di almeno 3 caratteri"),
  password: z.string().min(6, "Password deve essere di almeno 6 caratteri"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve essere di almeno 2 caratteri"),
  username: z.string().min(3, "Username deve essere di almeno 3 caratteri"),
  password: z.string().min(6, "Password deve essere di almeno 6 caratteri"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  isBarber: z.boolean().default(false),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { loginMutation, registerMutation, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
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
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  // Feature item animation
  const featureItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 + i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col lg:flex-row overflow-hidden">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-white py-12 px-8 flex flex-col justify-center lg:w-1/2 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2.5 bg-white/10 rounded-full">
              <Scissors className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">BarberBook</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-5 leading-tight">
            Gestisci il tuo salone da barbiere con eleganza
          </h2>
          
          <p className="text-xl opacity-90 mb-10 leading-relaxed">
            La piattaforma professionale per organizzare appuntamenti, gestire clienti 
            e far crescere la tua attività.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {mounted && (
              <>
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="font-semibold text-xl mb-4 flex items-center">
                    <span className="p-2 bg-white/20 rounded-lg mr-3">
                      <User className="h-5 w-5" />
                    </span>
                    Per Barbieri
                  </h3>
                  <ul className="space-y-3.5">
                    {["Gestione calendario", "Inserimento clienti", "Chat con i clienti", "Statistiche e analisi"].map((item, i) => (
                      <motion.li 
                        key={item}
                        className="flex items-center text-white/90 hover:text-white"
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={featureItemVariants}
                      >
                        <CheckCircle2 className="mr-3 h-5 w-5 text-white/80" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
                
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <h3 className="font-semibold text-xl mb-4 flex items-center">
                    <span className="p-2 bg-white/20 rounded-lg mr-3">
                      <Calendar className="h-5 w-5" />
                    </span>
                    Per Clienti
                  </h3>
                  <ul className="space-y-3.5">
                    {["Prenotazione semplice", "Notifiche appuntamenti", "Comunicazione diretta", "Storia trattamenti"].map((item, i) => (
                      <motion.li 
                        key={item}
                        className="flex items-center text-white/90 hover:text-white"
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={featureItemVariants}
                      >
                        <CheckCircle2 className="mr-3 h-5 w-5 text-white/80" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </>
            )}
          </div>
          
          <div className="mt-12 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span className="flex items-center mr-4"><Clock className="h-4 w-4 mr-1" /> Risparmia tempo</span>
            <span className="flex items-center mr-4"><MessageSquare className="h-4 w-4 mr-1" /> Migliora comunicazione</span>
            <span className="flex items-center"><Bell className="h-4 w-4 mr-1" /> Riduci assenze</span>
          </div>
        </div>
      </div>

      {/* Auth forms */}
      <div className="flex items-center justify-center p-6 lg:p-12 lg:w-1/2 relative">
        {mounted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="border-0 shadow-xl rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="pt-8 pb-2">
                <CardTitle className="text-2xl font-bold text-center text-primary">
                  Benvenuto su BarberBook
                </CardTitle>
                <CardDescription className="text-center text-base pt-2">
                  {activeTab === "login" 
                    ? "Accedi per gestire i tuoi appuntamenti"
                    : "Crea un account per iniziare"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-6 pt-4 pb-2">
                <Tabs defaultValue="login" value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 rounded-lg p-1">
                    <TabsTrigger value="login" className="rounded-md py-2.5 data-[state=active]:shadow-md">
                      Accedi
                    </TabsTrigger>
                    <TabsTrigger value="register" className="rounded-md py-2.5 data-[state=active]:shadow-md">
                      Registrati
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 pt-2">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                                    className="h-11 pl-10 pr-4 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                                    placeholder="Inserisci il tuo username" 
                                    {...field}
                                    disabled={loginMutation.isPending}
                                  />
                                </div>
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
                              <div className="flex justify-between items-center">
                                <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                                <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                  Password dimenticata?
                                </a>
                              </div>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                                    className="h-11 pl-10 pr-4 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                                    type="password" 
                                    placeholder="Inserisci la tua password" 
                                    {...field}
                                    disabled={loginMutation.isPending}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs font-medium" />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full mt-6 h-12 rounded-lg text-base font-medium transition-all shadow-md hover:shadow-lg"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <ChevronRight className="mr-2 h-5 w-5" />
                          )}
                          Accedi
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="register">
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">Nome Completo</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                      className="h-11 pl-10 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                                      placeholder="Il tuo nome completo" 
                                      {...field}
                                      disabled={registerMutation.isPending}
                                    />
                                  </div>
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
                                    className="h-11 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
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
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                                    className="h-11 pl-10 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                                    placeholder="Numero di telefono (opzionale)" 
                                    {...field}
                                    disabled={registerMutation.isPending}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs font-normal text-gray-500 mt-1">
                                Per ricevere notifiche sugli appuntamenti
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
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                      className="h-11 pl-10 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                                      type="password" 
                                      placeholder="Crea una password" 
                                      {...field}
                                      disabled={registerMutation.isPending}
                                    />
                                  </div>
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
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                      className="h-11 pl-10 bg-white shadow-sm border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                                      type="password" 
                                      placeholder="Conferma la password" 
                                      {...field}
                                      disabled={registerMutation.isPending}
                                    />
                                  </div>
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
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-200 bg-white/80 p-4 shadow-sm">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={registerMutation.isPending}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">Sono un barbiere</FormLabel>
                                <FormDescription className="text-xs text-gray-500">
                                  Seleziona questa opzione se vuoi gestire un salone e avere accesso alle funzionalità avanzate
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full mt-5 h-12 rounded-lg text-base font-medium transition-all shadow-md hover:shadow-lg"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <ChevronRight className="mr-2 h-5 w-5" />
                          )}
                          Crea Account
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
              
              <CardFooter className="flex justify-center pt-2 pb-8">
                <p className="text-sm text-center text-gray-600">
                  {activeTab === "login" ? (
                    <>
                      Non hai un account?{" "}
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm font-semibold text-primary hover:text-primary/80" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleTabChange("register");
                        }}
                      >
                        Registrati ora
                      </Button>
                    </>
                  ) : (
                    <>
                      Hai già un account?{" "}
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm font-semibold text-primary hover:text-primary/80" 
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
