"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FirebaseAvatar } from "@/components/FirebaseAvatar";
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
import { LogOut, User, LayoutGrid, GanttChartSquare, Search } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "../ui/skeleton";
import { usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function UserNav() {
  const { user, userProfile, loading, logout } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'en';

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al cerrar sesión.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    );
  }

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuItem asChild>
            <Link href={`/${lang}/login`}>
              Log In
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${lang}/signup`}>
              Sign Up
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
           <DropdownMenuItem asChild>
            <Link href={`/${lang}/booking-lookup`}>
              <Search className="mr-2 h-4 w-4" />
              <span>Find Reservation</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const isAdmin = userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <FirebaseAvatar 
            src={user.photoURL} 
            alt={user.displayName || 'User'}
            fallback={user.displayName ? user.displayName.substring(0,2).toUpperCase() : user.email?.substring(0,2).toUpperCase()}
            className="h-8 w-8"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || 'TeeReserve User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/${lang}/profile`}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href={`/${lang}/profile#bookings`}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>My Bookings</span>
             </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
                <Link href={`/${lang}/admin/dashboard`}>
                    <GanttChartSquare className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
