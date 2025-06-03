import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import JobCollection from "@/pages/JobCollection";
import CommentAnalysis from "@/pages/CommentAnalysis";
import AutoReplies from "@/pages/AutoReplies";
import TaskScheduling from "@/pages/TaskScheduling";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/job-collection" component={JobCollection} />
          <Route path="/comment-analysis" component={CommentAnalysis} />
          <Route path="/auto-replies" component={AutoReplies} />
          <Route path="/task-scheduling" component={TaskScheduling} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
