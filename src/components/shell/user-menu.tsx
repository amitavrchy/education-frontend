"use client";

import { FlaskConical, LogOut, Settings, User, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser, useLogout, useSwitchRole } from "@/hooks/use-auth";
import { useT } from "@/i18n";
import { getInitials } from "@/lib/helpers";
import { useAuthStore } from "@/stores/auth-store";
import { USER_ROLES, type UserRole } from "@/types";
import { usePortal } from "./portal-context";

export function UserMenu() {
  const portal = usePortal();
  const user = useCurrentUser();
  const logout = useLogout();
  const switchRole = useSwitchRole();
  const originalRole = useAuthStore((s) => s.originalRole);
  const t = useT();
  const name = user?.name ?? t("shell.guest");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label={t("shell.profile")}>
          <Avatar className="size-8">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-primary">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium xl:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user ? t(`roles.${user.role}`) : ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${portal.basePath}/settings`}>
            <User /> {t("shell.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${portal.basePath}/settings?tab=appearance`}>
            <Settings /> {t("shell.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FlaskConical /> {t("shell.demoRoleSwitcher")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("shell.demoRoleHint")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={user?.role} onValueChange={(v) => void switchRole(v as UserRole)}>
              {USER_ROLES.map((role) => (
                <DropdownMenuRadioItem key={role} value={role}>
                  {t(`roles.${role}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {originalRole && originalRole !== user?.role && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void switchRole(originalRole)}>
                  <UserRoundCog /> {t(`roles.${originalRole}`)} ↩
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <LogOut /> {t("shell.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
