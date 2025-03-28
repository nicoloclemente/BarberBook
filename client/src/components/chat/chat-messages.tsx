import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { MessageWithSender } from "@shared/schema";
import { ProfileImage } from "@/components/ui/profile-image";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { addEventListener, removeEventListener } from "@/lib/websocket";
import { Loader2 } from "lucide-react";

interface ChatMessagesProps {
  userId: number;
}

export default function ChatMessages({ userId }: ChatMessagesProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [groupedMessages, setGroupedMessages] = useState<
    { date: string; messages: MessageWithSender[] }[]
  >([]);

  const { data: messages = [], isLoading, refetch } = useQuery<MessageWithSender[]>({
    queryKey: ['/api/messages', userId],
    queryFn: () => getQueryFn({ on401: "throw" })({
      queryKey: [`/api/messages/${userId}`],
    }),
    enabled: !!userId,
  });

  // Listen for new messages via WebSocket
  useEffect(() => {
    const handleNewMessage = (message: MessageWithSender) => {
      if (
        (message.senderId === userId && message.receiverId === user?.id) ||
        (message.senderId === user?.id && message.receiverId === userId)
      ) {
        refetch();
      }
    };

    addEventListener('message', handleNewMessage);

    return () => {
      removeEventListener('message', handleNewMessage);
    };
  }, [userId, user?.id, refetch]);

  // Group messages by date
  useEffect(() => {
    const groups: Record<string, MessageWithSender[]> = {};

    messages.forEach(message => {
      const date = typeof message.timestamp === 'string' 
        ? new Date(message.timestamp) 
        : message.timestamp;
      
      let dateKey: string;
      
      if (isToday(date)) {
        dateKey = 'Oggi';
      } else if (isYesterday(date)) {
        dateKey = 'Ieri';
      } else {
        dateKey = format(date, 'EEEE, d MMMM yyyy', { locale: it });
        // Capitalize first letter
        dateKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(message);
    });

    const result = Object.entries(groups).map(([date, messages]) => ({
      date,
      messages,
    }));

    setGroupedMessages(result);
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupedMessages]);

  const formatMessageTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return format(date, 'HH:mm');
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-center text-neutral-dark">
          <p>Nessun messaggio</p>
          <p className="text-sm">Inizia a chattare ora</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Separator */}
            <div className="flex justify-center mb-4">
              <span className="text-xs text-neutral-dark bg-neutral-light px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>
            
            {/* Messages */}
            <div className="space-y-4">
              {group.messages.map((message, i) => {
                const isCurrentUser = message.senderId === user?.id;
                const showSender = i === 0 || group.messages[i - 1].senderId !== message.senderId;
                
                return (
                  <div 
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`p-3 rounded-lg max-w-xs ${
                        isCurrentUser 
                          ? 'bg-primary text-white chat-bubble-barber' 
                          : 'bg-neutral-light chat-bubble-client'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span 
                        className={`text-xs block text-right mt-1 ${
                          isCurrentUser ? 'text-white text-opacity-70' : 'text-neutral-dark'
                        }`}
                      >
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
