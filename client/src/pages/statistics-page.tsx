import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { getQueryFn } from '@/lib/queryClient';
import MainLayout from '@/components/main-layout';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Scissors, 
  Star 
} from 'lucide-react';
import { Statistics } from '@shared/schema';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

// Colori per i grafici
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

type Period = 'week' | 'month' | 'year';

export default function StatisticsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return startOfMonth(now);
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const now = new Date();
    return endOfMonth(now);
  });

  // Aggiorna le date quando il periodo cambia
  useEffect(() => {
    const now = new Date();
    
    switch (period) {
      case 'week':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'year':
        setStartDate(startOfMonth(subMonths(now, 11)));
        setEndDate(endOfMonth(now));
        break;
    }
  }, [period]);

  // Recupera le statistiche dal server
  const { data: statistics = [], isLoading } = useQuery<Statistics[]>({
    queryKey: ['/api/statistics', user?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const path = `/api/statistics?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
      const response = await fetch(path);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Non autorizzato');
        }
        throw new Error('Errore nel caricamento delle statistiche');
      }
      return response.json();
    },
    enabled: !!user?.isBarber,
  });

  // Calcola le statistiche aggregate
  const aggregatedStats = {
    totalAppointments: statistics.reduce((sum: number, stat: Statistics) => sum + stat.totalAppointments, 0),
    completedAppointments: statistics.reduce((sum: number, stat: Statistics) => sum + stat.completedAppointments, 0),
    totalRevenue: statistics.reduce((sum: number, stat: Statistics) => sum + stat.totalRevenue, 0),
    newClients: statistics.reduce((sum: number, stat: Statistics) => sum + stat.newClients, 0),
    averageRating: statistics.length ? 
      statistics.reduce((sum: number, stat: Statistics) => sum + Number(stat.averageRating || 0), 0) / statistics.length :
      0
  };

  // Formatta i dati per i grafici
  const chartData = statistics.map((stat: Statistics) => ({
    date: format(new Date(stat.date), 'dd/MM', { locale: it }),
    revenue: stat.totalRevenue / 100, // Converti da centesimi a euro
    appointments: stat.totalAppointments,
    completedAppointments: stat.completedAppointments,
    newClients: stat.newClients,
    rating: Number(stat.averageRating || 0)
  }));

  // Dati per il grafico a torta del tasso di completamento
  const completionRateData = [
    { name: 'Completati', value: aggregatedStats.completedAppointments },
    { name: 'Non completati', value: aggregatedStats.totalAppointments - aggregatedStats.completedAppointments }
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-primary">Statistiche e Analisi</h2>
            
            <div className="flex space-x-2">
              <Select 
                value={period} 
                onValueChange={(value) => setPeriod(value as Period)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleziona periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Ultima settimana</SelectItem>
                  <SelectItem value="month">Mese corrente</SelectItem>
                  <SelectItem value="year">Ultimi 12 mesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Indicatori principali */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Appuntamenti Totali</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  Nel periodo selezionato
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{(aggregatedStats.totalRevenue / 100).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Nel periodo selezionato
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Nuovi Clienti</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.newClients}</div>
                <p className="text-xs text-muted-foreground">
                  Nel periodo selezionato
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tasso di Completamento</CardTitle>
                <Scissors className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aggregatedStats.totalAppointments
                    ? ((aggregatedStats.completedAppointments / aggregatedStats.totalAppointments) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Appuntamenti completati su totali
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valutazione Media</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.averageRating.toFixed(1)}</div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(aggregatedStats.averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grafici */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Grafico andamento ricavi */}
            <Card className="col-span-1 xl:col-span-2">
              <CardHeader>
                <CardTitle>Andamento Ricavi</CardTitle>
                <CardDescription>
                  Ricavi giornalieri nel periodo selezionato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `€${value}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Ricavi (€)"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Grafico appuntamenti */}
            <Card>
              <CardHeader>
                <CardTitle>Appuntamenti</CardTitle>
                <CardDescription>
                  Numero di appuntamenti giornalieri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="appointments" 
                        name="Appuntamenti Totali" 
                        fill="#8884d8" 
                      />
                      <Bar 
                        dataKey="completedAppointments" 
                        name="Appuntamenti Completati" 
                        fill="#82ca9d" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Grafico tasso di completamento */}
            <Card>
              <CardHeader>
                <CardTitle>Tasso di Completamento</CardTitle>
                <CardDescription>
                  Percentuale di appuntamenti completati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionRateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {completionRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabella dettagliata */}
          <Card>
            <CardHeader>
              <CardTitle>Dettaglio Statistiche</CardTitle>
              <CardDescription>
                Statistiche giornaliere nel periodo selezionato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-4 text-left font-medium">Data</th>
                      <th className="py-2 px-4 text-left font-medium">Appuntamenti</th>
                      <th className="py-2 px-4 text-left font-medium">Completati</th>
                      <th className="py-2 px-4 text-left font-medium">Nuovi Clienti</th>
                      <th className="py-2 px-4 text-left font-medium">Ricavi</th>
                      <th className="py-2 px-4 text-left font-medium">Valutazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.length > 0 ? (
                      statistics.map((stat: Statistics, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">
                            {format(new Date(stat.date), 'dd/MM/yyyy', { locale: it })}
                          </td>
                          <td className="py-2 px-4">{stat.totalAppointments}</td>
                          <td className="py-2 px-4">{stat.completedAppointments}</td>
                          <td className="py-2 px-4">{stat.newClients}</td>
                          <td className="py-2 px-4">€{(stat.totalRevenue / 100).toFixed(2)}</td>
                          <td className="py-2 px-4">
                            <div className="flex items-center">
                              {Number(stat.averageRating || 0).toFixed(1)}
                              <div className="ml-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`inline h-3 w-3 ${
                                      star <= Math.round(Number(stat.averageRating || 0))
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 px-4 text-center text-muted-foreground">
                          Nessuna statistica disponibile per il periodo selezionato
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}