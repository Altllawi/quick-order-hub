import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import SelectRestaurant from "./pages/SelectRestaurant";
import RestaurantDashboard from "./pages/dashboard/RestaurantDashboard";
import Overview from "./pages/dashboard/Overview";
import Orders from "./pages/dashboard/Orders";
import Menu from "./pages/dashboard/Menu";
import Tables from "./pages/dashboard/Tables";
import Theme from "./pages/dashboard/Theme";
import Admins from "./pages/dashboard/Admins";
import Settings from "./pages/dashboard/Settings";
import StaffDirectory from "./pages/dashboard/StaffDirectory";
import StaffHours from "./pages/dashboard/StaffHours";
import SuperDashboard from "./pages/super/SuperDashboard";
import Restaurants from "./pages/super/Restaurants";
import SuperAdmins from "./pages/super/SuperAdmins";
import PWA from "./pages/pwa/PWA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/select-restaurant" element={<ProtectedRoute><SelectRestaurant /></ProtectedRoute>} />
            
            <Route path="/dashboard/:restaurantId" element={<ProtectedRoute><RestaurantDashboard /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={<Menu />} />
              <Route path="tables" element={<Tables />} />
              <Route path="staff" element={<StaffDirectory />} />
              <Route path="staff-hours" element={<StaffHours />} />
              <Route path="theme" element={<Theme />} />
              <Route path="admins" element={<Admins />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/super" element={<ProtectedRoute requireSuperAdmin><SuperDashboard /></ProtectedRoute>}>
              <Route index element={<Restaurants />} />
              <Route path="admins" element={<SuperAdmins />} />
            </Route>

            {/* PWA Routes - with and without tableId */}
            <Route path="/pwa/:restaurantId/:tableId" element={<PWA />} />
            <Route path="/pwa/:restaurantId" element={<PWA />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
