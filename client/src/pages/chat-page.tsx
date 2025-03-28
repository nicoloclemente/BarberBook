import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { connectWebSocket, addEventListener, removeEventListener, getWebSocketStatus } from "@/lib/websocket";
import MainLayout from "@/components/main-layout";
import ChatList from "@/components/chat/chat-list";
import ChatMessages from "@/components/chat/chat-messages";
import ChatInput from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";
import { ProfileImage } from "@/components/ui/profile-image";
import { PhoneIcon, InfoIcon } from "lucide-react";
import { User } from "@shared/schema";

export default function ChatPage() {
  const { user } = useAuth();
  const params = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    params.userId ? parseInt(params.userId) : null
  );

  const { data: chats = [] } = useQuery({
    queryKey: ['/api/chats'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: selectedUser } = useQuery<User>({
    queryKey: [`/api/user/${selectedUserId}`],
    queryFn: () => getQueryFn({ on401: "throw" })({
      queryKey: [`/api/user/${selectedUserId}`],
    }),
    enabled: !!selectedUserId,
  });

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      connectWebSocket(user.id);

      const handleNewMessage = () => {
        // Refresh chats when new message is received
      };

      addEventListener('message', handleNewMessage);

      return () => {
        removeEventListener('message', handleNewMessage);
      };
    }
  }, [user]);

  // Update URL when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      setLocation(`/chat/${selectedUserId}`);
    } else {
      setLocation('/chat');
    }
  }, [selectedUserId, setLocation]);

  // Initialize selected user from URL parameter
  useEffect(() => {
    if (params.userId) {
      setSelectedUserId(parseInt(params.userId));
    }
  }, [params.userId]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2">
          <h2 className="text-2xl font-heading font-bold text-primary mb-6">Messaggi</h2>
          
          <div className="flex h-[calc(100vh-220px)]">
            {/* Chat Sidebar/List */}
            <div className="w-full md:w-1/3 border-r border-neutral-light overflow-y-auto">
              <ChatList 
                chats={chats} 
                selectedUserId={selectedUserId}
                onSelectChat={(userId) => setSelectedUserId(userId)}
              />
            </div>

            {/* Chat Content */}
            <div className="hidden md:flex md:flex-1 md:flex-col">
              {selectedUserId && selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-neutral-light flex items-center">
                    <ProfileImage user={selectedUser} className="mr-3" />
                    <div className="flex-1">
                      <h3 className="font-medium">{selectedUser.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {getWebSocketStatus() === 'connected' ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {selectedUser.phone && (
                        <Button variant="ghost" size="icon" title={`Chiama ${selectedUser.name}`}>
                          <PhoneIcon className="h-5 w-5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Informazioni">
                        <InfoIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <ChatMessages userId={selectedUserId} />
                  
                  {/* Chat Input */}
                  <ChatInput receiverId={selectedUserId} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p>Seleziona una chat per iniziare a messaggiare</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
