import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Calendar, LayoutDashboard, Users, Clock, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { name: 'Calendar', href: '/calendar', icon: Calendar, testId: 'nav-calendar' },
    { name: 'Rooms', href: '/rooms', icon: Building2, testId: 'nav-rooms' },
    { name: 'Requests', href: '/requests', icon: Clock, testId: 'nav-requests' },
  ];

  const handleSignOut = async () => {
    await signOut();
    setLocation('/auth');
  };

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex items-center gap-1 text-primary">
              <Building2 className="w-5 h-5" />
              <Calendar className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">Office Tracker</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  data-testid={item.testId}
                  onClick={() => setLocation(item.href)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} data-testid="button-sign-out">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              data-testid="button-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="flex flex-col p-4 gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    data-testid={item.testId}
                    onClick={() => {
                      setLocation(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
