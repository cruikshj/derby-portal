import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import Home from "@/pages/home";
import Register from "@/pages/register";
import Gallery from "@/pages/gallery";
import Rules from "@/pages/rules";
import Band from "@/pages/band";
import Admin from "@/pages/admin";
import AdminEventEditor from "@/pages/admin-event-editor";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/rules" component={Rules} />
      <Route path="/band" component={Band} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/events/:id" component={AdminEventEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Navbar />
              <main>
                <Router />
              </main>
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
