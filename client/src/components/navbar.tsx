import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Home, FileText, UserPlus, Calendar, Settings, Info, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DerbyEventWithDetails } from "@shared/schema";

const coreNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/register", label: "Register", icon: UserPlus },
  { href: "/gallery", label: "Gallery", icon: Trophy },
];

const rulesNavLink = { href: "/rules", label: "Rules", icon: FileText };
const infoNavLink = { href: "/info", label: "Info", icon: Info };
const bandNavLink = { href: "/band", label: "Band Updates", icon: Calendar };

const adminLinks = [
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  const { data: bandStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/band/status"],
  });
  
  const { data: activeEvent } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });
  
  const hasRules = activeEvent?.rules && activeEvent.rules.trim().length > 0;
  const hasInfo = activeEvent?.info && activeEvent.info.trim().length > 0;
  
  const navLinks = [
    coreNavLinks[0], // Home
    ...(hasInfo ? [infoNavLink] : []),
    ...(hasRules ? [rulesNavLink] : []),
    ...coreNavLinks.slice(1), // Register, Gallery
    ...(bandStatus?.configured ? [bandNavLink] : []),
  ];

  const allNavLinks = [
    ...navLinks,
    ...(isAuthenticated && user?.isAdmin ? adminLinks : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex-1 flex items-center">
            <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
              <Trophy className="h-8 w-8 text-scout-gold" />
              <span className="font-display font-bold text-xl hidden sm:block">Pinewood Derby</span>
            </Link>
          </div>

          <div className="flex-none flex items-center justify-center gap-1">
              {allNavLinks.map((link) => (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>
                    <Link href={link.href}>
                      <Button
                        variant={location === link.href ? "secondary" : "ghost"}
                        size="icon"
                        className={cn(
                          "md:hidden",
                          location === link.href && "bg-accent"
                        )}
                        data-testid={`link-nav-mobile-${link.label.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <link.icon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{link.label}</TooltipContent>
                </Tooltip>
              ))}
              {allNavLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={location === link.href ? "secondary" : "ghost"}
                    className={cn(
                      "hidden md:flex gap-2",
                      location === link.href && "bg-accent"
                    )}
                    data-testid={`link-nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
          </div>

          <div className="flex-1 flex items-center justify-end gap-2">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-profile-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel data-testid="text-username">{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleTheme} data-testid="button-theme-toggle">
                    {theme === "light" ? (
                      <Moon className="h-4 w-4 mr-2" />
                    ) : (
                      <Sun className="h-4 w-4 mr-2" />
                    )}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="hidden md:flex"
                  data-testid="button-theme-toggle"
                >
                  {theme === "light" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
                <Button
                  onClick={login}
                  className="hidden sm:flex"
                  data-testid="button-login"
                >
                  Sign In
                </Button>
                <Button
                  onClick={login}
                  size="icon"
                  variant="ghost"
                  className="sm:hidden"
                  data-testid="button-login-mobile"
                >
                  <LogOut className="h-5 w-5 rotate-180" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
