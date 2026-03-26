import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EvaluationProvider } from "@/contexts/EvaluationContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import AdminRoute from "@/components/AdminRoute";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import CompanyPage from "./pages/CompanyPage";
import EvaluationPage from "./pages/EvaluationPage";
import ReviewPage from "./pages/ReviewPage";
import ResultPage from "./pages/ResultPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EvaluationProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/avaliador" element={<Index />} />
              <Route path="/empresa" element={<CompanyPage />} />
              <Route path="/avaliacao" element={<EvaluationPage />} />
              <Route path="/revisao" element={<ReviewPage />} />
              <Route path="/resultado" element={<ResultPage />} />
              <Route path="/resultado/:id" element={<ResultPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><AnalyticsDashboardPage /></AdminRoute>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AdminAuthProvider>
      </EvaluationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
