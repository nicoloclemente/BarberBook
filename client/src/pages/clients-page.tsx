import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import MainLayout from "@/components/main-layout";
import { ProfileImage } from "@/components/ui/profile-image";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, MessageSquare, Search, UserPlus } from "lucide-react";

export default function ClientsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/clients'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.isBarber,
  });

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.phone && client.phone.includes(searchQuery))
  );

  if (!user?.isBarber) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold mb-2">Accesso Limitato</h2>
                <p className="text-muted-foreground mb-4">
                  Solo i barbieri possono accedere alla gestione dei clienti.
                </p>
                <Button asChild>
                  <Link href="/">Torna alla Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-primary">Gestione Clienti</h2>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi Cliente
            </Button>
          </div>

          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cerca cliente per nome, username o telefono..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredClients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <ProfileImage user={client} size="sm" className="mr-3" />
                            <span className="font-medium">{client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>@{client.username}</TableCell>
                        <TableCell>{client.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/chat/${client.id}`}>
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Messaggio
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Nessun cliente corrisponde alla ricerca"
                      : "Nessun cliente registrato"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
