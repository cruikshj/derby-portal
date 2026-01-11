import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import Home from "@/pages/home";
import Register from "@/pages/register";
import Gallery from "@/pages/gallery";
import Rules from "@/pages/rules";
import Info from "@/pages/info";
import Band from "@/pages/band";
import Admin from "@/pages/admin";
import AdminEventEditor from "@/pages/admin-event-editor";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Ban } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/rules" component={Rules} />
      <Route path="/info" component={Info} />
      <Route path="/band" component={Band} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/events/:id" component={AdminEventEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="h-12 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function PendingAccessScreen() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle>Access Pending</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your account is pending approval by an administrator. You will be able to access the site once your account has been approved.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check back later or contact an administrator for assistance.
          </p>
          <Button variant="outline" onClick={() => logout()} data-testid="button-logout-pending">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DisabledAccessScreen() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Account Disabled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your account has been disabled. You are no longer able to access this site.
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact an administrator.
          </p>
          <Button variant="outline" onClick={() => logout()} data-testid="button-logout-disabled">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthenticatedApp() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  const accessStatus = user?.accessStatus || "pending";

  if (accessStatus === "pending") {
    return <PendingAccessScreen />;
  }

  if (accessStatus === "disabled") {
    return <DisabledAccessScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AuthenticatedApp />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
