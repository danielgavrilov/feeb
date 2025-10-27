import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MenuUploadPage from "./pages/MenuUpload";
import { LanguageProvider } from "./contexts/LanguageContext";
import { PostHogProvider } from "posthog-js/react";
import { PostHogUserDetector } from "./lib/posthog";

const queryClient = new QueryClient();

const App = () => (
  <PostHogProvider
    apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
    options={{
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      defaults: "2025-05-24",
      capture_exceptions: true,
      // Uncomment to get debug logs in development
      // debug: import.meta.env.MODE === "development",
      // Do not store any cookies
      persistence: "memory",
      // Discard the IP that reaches PostHog server
      ip: false,
    }}
  >
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <PostHogUserDetector />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/signup" element={<SignupForm />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <MenuUploadPage />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </PostHogProvider>
);

export default App;
