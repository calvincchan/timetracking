import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGetIdentity } from "@refinedev/core";

type User = {
  id: number;
  full_name: string;
};

export function UserAvatar() {
  const { data: user, isLoading: userIsLoading } = useGetIdentity<User>();

  if (userIsLoading || !user) {
    return <Skeleton className={cn("h-10", "w-10", "rounded-full")} />;
  }

  const { full_name } = user;

  return (
    <Avatar className={cn("h-10", "w-10")}>
      <AvatarFallback>{getInitials(full_name)}</AvatarFallback>
    </Avatar>
  );
}

const getInitials = (name = "") => {
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();

  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

UserAvatar.displayName = "UserAvatar";
