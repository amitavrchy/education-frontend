"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePortal } from "@/contexts/portal-context";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/helpers";

export function UserDropdown() {
  const portal = usePortal();
  const user = useCurrentUser();
  const logout = useLogout();

  const name = user?.name ?? "অতিথি";
  const subtitle = user?.email ?? ROLE_LABELS[portal.key];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="ব্যবহারকারী মেনু">
          <Avatar className="size-8">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-primary">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium md:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{subtitle}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`${portal.basePath}/settings`}>
              <User /> প্রোফাইল
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${portal.basePath}/settings`}>
              <Settings /> সেটিংস
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logout.mutate()}>
          <LogOut /> লগআউট
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
