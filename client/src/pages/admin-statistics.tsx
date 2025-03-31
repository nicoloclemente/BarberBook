import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/components/main-layout';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ActivityIcon,
  Users,
  Server,
  Cpu,
  Database,
  Calendar,
  Clock,
  BarChart4,
  CircleUser,
  Scissors
} from 'lucide-react';

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Colori per i grafici
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Tipi per le statistiche di sistema
interface SystemStats {
  system: {
    uptime: {
      days: number;
      hours: number;
      minutes: number;
      raw: number;
    };
    cpu: {
      cores: number;
      model: string;
      usage: string;
    };
    memory: {
      total: string;
      used: string;
      free: string;
      usagePercentage: string;
    };
    platform: string;
    hostname: string;
    type: string;
    release: string;
  };
  users: {
    total: number;
    barbers: number;
    clients: number;
    online: {
      current: number;
      recentlyActive: number;
    };
  };
  connections: {
    active: number;
    websocketClients: number;
  };
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  clientsPerBarber: Array<{
    barberId: number;
    barberName: string;
    clientCount: number;
    appointmentCount: number;
    pendingCount: number;
    confirmedCount: number;
    cancelledCount: number;
    completedCount: number;
  }>;
}

// Tipo per gli utenti online
interface OnlineUser {
  id: number;
  name: string;
  username: string;
  role: string;
  isBarber: boolean;
  lastActivity: string;
}

interface OnlineUsersData {
  totalOnline: number;
  users: OnlineUser[];
}

// Tipo per i clienti per barbiere
interface ClientPerBarber {
  barberId: number;
  barberName: string;
  clientCount: number;
  clients: Array<{
    id: number;
    name: string;
    username: string;
    appointmentCount: number;
    lastAppointment: string | null;
  }>;
}

export default function AdminStatisticsPage() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 secondi di default
  
  // Recupera statistiche di sistema
  const { data: systemStats, refetch: refetchSystemStats } = useQuery<SystemStats>({
    queryKey: ['/api/admin/system-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system-stats');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Non autorizzato');
        } else if (response.status === 403) {
          throw new Error('Accesso negato: solo gli amministratori possono visualizzare queste statistiche');
        }
        throw new Error('Errore nel caricamento delle statistiche di sistema');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: refreshInterval
  });

  // Recupera gli utenti online
  const { data: onlineUsers, refetch: refetchOnlineUsers } = useQuery<OnlineUsersData>({
    queryKey: ['/api/admin/online-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/online-users');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Non autorizzato');
        } else if (response.status === 403) {
          throw new Error('Accesso negato: solo gli amministratori possono visualizzare questi dati');
        }
        throw new Error('Errore nel caricamento degli utenti online');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: refreshInterval
  });

  // Recupera i clienti per barbiere
  const { data: clientsPerBarber } = useQuery<ClientPerBarber[]>({
    queryKey: ['/api/admin/clients-per-barber'],
    queryFn: async () => {
      const response = await fetch('/api/admin/clients-per-barber');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Non autorizzato');
        } else if (response.status === 403) {
          throw new Error('Accesso negato: solo gli amministratori possono visualizzare questi dati');
        }
        throw new Error('Errore nel caricamento dei clienti per barbiere');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'admin'
  });

  // Aggiorna manualmente tutte le statistiche
  const refreshAllStats = () => {
    refetchSystemStats();
    refetchOnlineUsers();
  };

  // Formatta il tempo di attività del server in una stringa leggibile
  const formatUptime = (uptime: { days: number; hours: number; minutes: number }) => {
    const { days, hours, minutes } = uptime;
    const parts = [];
    
    if (days > 0) {
      parts.push(`${days} giorn${days === 1 ? 'o' : 'i'}`);
    }
    
    if (hours > 0 || parts.length > 0) {
      parts.push(`${hours} or${hours === 1 ? 'a' : 'e'}`);
    }
    
    parts.push(`${minutes} minut${minutes === 1 ? 'o' : 'i'}`);
    
    return parts.join(', ');
  };

  // Prepara i dati per il grafico a torta degli appuntamenti
  const appointmentsPieData = systemStats ? [
    { name: 'In attesa', value: systemStats.appointments.pending },
    { name: 'Confermati', value: systemStats.appointments.confirmed },
    { name: 'Completati', value: systemStats.appointments.completed },
    { name: 'Annullati', value: systemStats.appointments.cancelled }
  ] : [];

  // Prepara i dati per il grafico a barre dei clienti per barbiere
  const clientsPerBarberData = systemStats?.clientsPerBarber.map(barber => ({
    name: barber.barberName,
    clienti: barber.clientCount,
    appuntamenti: barber.appointmentCount
  })) || [];

  // Ritorna il colore per lo stato dell'appuntamento
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Formatta la data dell'ultima attività
  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) {
      return 'meno di un minuto fa';
    } else if (diffSec < 3600) {
      const minutes = Math.floor(diffSec / 60);
      return `${minutes} minut${minutes === 1 ? 'o' : 'i'} fa`;
    } else if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours} or${hours === 1 ? 'a' : 'e'} fa`;
    } else {
      const days = Math.floor(diffSec / 86400);
      return `${days} giorn${days === 1 ? 'o' : 'i'} fa`;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-primary">Statistiche Avanzate</h2>
            
            <div className="flex space-x-2">
              <button 
                onClick={refreshAllStats}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <ActivityIcon className="mr-2 h-4 w-4" />
                Aggiorna Statistiche
              </button>
            </div>
          </div>

          {/* Server Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  Stato del Server
                </CardTitle>
                <CardDescription>
                  Informazioni sullo stato attuale del server
                </CardDescription>
              </CardHeader>
              <CardContent>
                {systemStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Piattaforma</h4>
                        <p className="text-lg font-medium">{systemStats.system.platform} / {systemStats.system.type}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Tempo di Attività</h4>
                        <p className="text-lg font-medium">{formatUptime(systemStats.system.uptime)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">CPU</h4>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-md">{systemStats.system.cpu.model} ({systemStats.system.cpu.cores} cores)</p>
                        <div className="flex items-center">
                          <Cpu className="h-4 w-4 mr-1" />
                          <span className="font-bold">{systemStats.system.cpu.usage}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: systemStats.system.cpu.usage }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Memoria</h4>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-md">
                          {systemStats.system.memory.used} / {systemStats.system.memory.total}
                        </p>
                        <div className="flex items-center">
                          <Database className="h-4 w-4 mr-1" />
                          <span className="font-bold">{systemStats.system.memory.usagePercentage}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: systemStats.system.memory.usagePercentage }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Caricamento delle informazioni di sistema...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Utenti e Connessioni
                </CardTitle>
                <CardDescription>
                  Statistiche degli utenti registrati e attualmente online
                </CardDescription>
              </CardHeader>
              <CardContent>
                {systemStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Utenti Totali</h4>
                        <p className="text-2xl font-medium">{systemStats.users.total}</p>
                        <div className="mt-1 flex space-x-3 text-xs">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {systemStats.users.barbers} barbieri
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {systemStats.users.clients} clienti
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Utenti Online</h4>
                        <p className="text-2xl font-medium">{systemStats.users.online.current}</p>
                        <div className="mt-1 text-xs">
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            {systemStats.users.online.recentlyActive} attivi recentemente
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Connessioni Attive</h4>
                      <div className="mt-2 flex items-center">
                        <div className="bg-primary rounded-full h-3 w-3 mr-2 animate-pulse"></div>
                        <p className="text-lg">{systemStats.connections.active} connessioni WebSocket attive</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Appuntamenti</h4>
                      <p className="text-lg font-medium">{systemStats.appointments.total} totali</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${getStatusColor('pending')}`}>
                          {systemStats.appointments.pending} in attesa
                        </span>
                        <span className={`px-2 py-1 rounded-full ${getStatusColor('confirmed')}`}>
                          {systemStats.appointments.confirmed} confermati
                        </span>
                        <span className={`px-2 py-1 rounded-full ${getStatusColor('completed')}`}>
                          {systemStats.appointments.completed} completati
                        </span>
                        <span className={`px-2 py-1 rounded-full ${getStatusColor('cancelled')}`}>
                          {systemStats.appointments.cancelled} annullati
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Caricamento delle informazioni sugli utenti...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grafici */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart4 className="mr-2 h-5 w-5" />
                  Clienti per Barbiere
                </CardTitle>
                <CardDescription>
                  Numero di clienti serviti da ogni barbiere
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {clientsPerBarberData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={clientsPerBarberData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="clienti" name="Clienti Unici" fill="#8884d8" />
                        <Bar dataKey="appuntamenti" name="Appuntamenti" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Nessun dato disponibile
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Distribuzione Appuntamenti
                </CardTitle>
                <CardDescription>
                  Distribuzione degli appuntamenti per stato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {appointmentsPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={appointmentsPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => 
                            percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                          }
                        >
                          {appointmentsPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Nessun dato disponibile
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Utenti Online */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CircleUser className="mr-2 h-5 w-5" />
                Utenti Online
              </CardTitle>
              <CardDescription>
                Elenco degli utenti recentemente attivi (negli ultimi 5 minuti)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineUsers && onlineUsers.users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Ultima Attività</TableHead>
                        <TableHead>Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {onlineUsers.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>
                            {user.role === 'admin' ? (
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Admin</span>
                            ) : user.isBarber ? (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Barbiere</span>
                            ) : (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Cliente</span>
                            )}
                          </TableCell>
                          <TableCell>{formatLastActivity(user.lastActivity)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                              <span>Online</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {onlineUsers ? 'Nessun utente online al momento' : 'Caricamento degli utenti online...'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dettaglio Barbieri e Clienti */}
          {clientsPerBarber && clientsPerBarber.length > 0 && (
            <div className="space-y-6">
              {clientsPerBarber.map((barber) => (
                <Card key={barber.barberId}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Scissors className="mr-2 h-5 w-5" />
                      Clienti di {barber.barberName}
                    </CardTitle>
                    <CardDescription>
                      {barber.clientCount} clienti, {barber.clients.length} clienti con appuntamenti recenti
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {barber.clients.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Username</TableHead>
                              <TableHead>Appuntamenti</TableHead>
                              <TableHead>Ultimo Appuntamento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {barber.clients.map((client) => (
                              <TableRow key={client.id}>
                                <TableCell className="font-medium">{client.name}</TableCell>
                                <TableCell>{client.username}</TableCell>
                                <TableCell>{client.appointmentCount}</TableCell>
                                <TableCell>
                                  {client.lastAppointment ? (
                                    new Date(client.lastAppointment).toLocaleDateString('it-IT', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  ) : (
                                    'N/A'
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Nessun cliente recente per questo barbiere
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}