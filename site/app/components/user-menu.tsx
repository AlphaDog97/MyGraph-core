import { LogOut } from "lucide-react";
import type { SignedInUser } from "@/app/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function UserMenu({ user }: { user: SignedInUser }) {
  const initials = user.displayName.trim().slice(0, 2).toLocaleUpperCase();
  return (
    <div className="user-menu">
      <Avatar>
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials || "MG"}</AvatarFallback>
      </Avatar>
      <div className="user-menu-copy">
        <strong>{user.displayName}</strong>
        <span>{user.provider === "github" ? "GitHub" : user.email}</span>
      </div>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="退出登录" title="退出登录">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
