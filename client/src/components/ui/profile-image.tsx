import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface ProfileImageProps {
  user: Partial<User>;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProfileImage({ user, className = "", size = "md" }: ProfileImageProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14"
  };

  const getInitials = () => {
    if (!user.name) return "?";
    
    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={user.imageUrl} alt={user.name || "User"} />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
