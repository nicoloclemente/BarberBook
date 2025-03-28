import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  receiverId: number;
}

export default function ChatInput({ receiverId }: ChatInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        receiverId,
        content,
        // senderId is set on the server from the authenticated user
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/messages', receiverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile inviare il messaggio: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter (without Shift key)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 border-t border-neutral-light">
      <form onSubmit={handleSubmit} className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mr-2 text-neutral-dark hover:text-primary rounded transition"
          disabled={sendMessageMutation.isPending}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          className="flex-1 p-3 border border-neutral-light rounded-lg min-h-[45px] max-h-[120px] resize-none"
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          className="p-2 bg-primary text-white rounded-lg ml-2 hover:bg-primary-light transition"
          disabled={!message.trim() || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
