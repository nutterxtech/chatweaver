import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthPage from "@/pages/AuthPage";
import ChatPage from "@/pages/ChatPage";
import { supabaseMisconfigured } from "@/lib/supabase";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#128C7E]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Loading WhatsChat...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route component={ChatPage} />
      </Switch>
    </WouterRouter>
  );
}

function MisconfiguredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#075E54]">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
        <div className="text-5xl mb-4">⚙️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Missing Environment Variables</h1>
        <p className="text-gray-500 text-sm mb-4">
          This deployment is missing the Supabase credentials. Add these two
          variables in your Vercel project settings under{" "}
          <strong>Settings → Environment Variables</strong>:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left text-xs font-mono space-y-2 border border-gray-200">
          <div className="text-gray-700">VITE_SUPABASE_URL</div>
          <div className="text-gray-700">VITE_SUPABASE_ANON_KEY</div>
        </div>
        <p className="text-gray-400 text-xs mt-4">
          Then redeploy for the changes to take effect.
        </p>
      </div>
    </div>
  );
}

function App() {
  if (supabaseMisconfigured) return <MisconfiguredScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
