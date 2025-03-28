import { useState } from "react";
import { User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { ProfileImage } from "@/components/ui/profile-image";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";
import { Search } from "lucide-react";

interface Chat {
  userId: number;
  user: User;
  lastMessage: {
    content: string;
    timestamp: Date | string;
  };
  unreadCount: number;
}

interface ChatListProps {
  chats: Chat[];
  selectedUserId: number | null;
  onSelectChat: (userId: number) => void;
}

export default function ChatList({ chats, selectedUserId, onSelectChat }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter(chat => 
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Ieri';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Cerca cliente..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        {filteredChats.length > 0 ? (
          filteredChats.map(chat => (
            <div
              key={chat.userId}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition ${
                selectedUserId === chat.userId 
                  ? 'bg-primary bg-opacity-5' 
                  : 'hover:bg-primary hover:bg-opacity-5'
              }`}
              onClick={() => onSelectChat(chat.userId)}
            >
              <ProfileImage 
                user={chat.user} 
                className={`mr-3 ${selectedUserId === chat.userId ? 'border-2 border-primary' : ''}`}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{chat.user.name}</h4>
                  <span className="text-xs text-neutral-dark">
                    {formatMessageTime(chat.lastMessage.timestamp)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-neutral-dark truncate max-w-[180px]">
                    {chat.lastMessage.content}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-neutral-dark">
            {searchQuery ? 'Nessun risultato trovato' : 'Nessuna chat recente'}
          </div>
        )}
      </div>
    </div>
  );
}
