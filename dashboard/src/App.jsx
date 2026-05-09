import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardHome from './pages/dashboard/DashboardHome';
import DriversPage from './pages/drivers/DriversPage';
import DriverDetailPage from './pages/drivers/DriverDetailPage';
import SupervisorsPage from './pages/supervisors/SupervisorsPage';
import SupervisorDetailPage from './pages/supervisors/SupervisorDetailPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import DocumentDetailPage from './pages/documents/DocumentDetailPage';
import LicensesPage from './pages/licenses/LicensesPage';
import LicenseDetailPage from './pages/licenses/LicenseDetailPage';
import BankAccountsPage from './pages/bank-accounts/BankAccountsPage';
import PlatformAccountsPage from './pages/platform-accounts/PlatformAccountsPage';
import ShiftsPage from './pages/shifts/ShiftsPage';
import ShiftDetailPage from './pages/shifts/ShiftDetailPage';
import FuelLogsPage from './pages/fuel/FuelLogsPage';
import FuelLogDetailPage from './pages/fuel/FuelLogDetailPage';
import ViolationsPage from './pages/violations/ViolationsPage';
import ViolationDetailPage from './pages/violations/ViolationDetailPage';
import IncidentsPage from './pages/incidents/IncidentsPage';
import IncidentDetailPage from './pages/incidents/IncidentDetailPage';
import DailyReportsPage from './pages/daily-reports/DailyReportsPage';
import DailyReportDetailPage from './pages/daily-reports/DailyReportDetailPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ChatPage from './pages/chat/ChatPage';
import InvestigationsPage from './pages/investigations/InvestigationsPage';
import PenaltiesPage from './pages/penalties/PenaltiesPage';
import RatingsPage from './pages/ratings/RatingsPage';
import RewardsPage from './pages/rewards/RewardsPage';
import LeavesPage from './pages/leaves/LeavesPage';
import SalaryAdvancesPage from './pages/salary-advances/SalaryAdvancesPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import MaintenanceRequestDetailPage from './pages/maintenance/MaintenanceRequestDetailPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminsPage from './pages/admins/AdminsPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Almarai', direction: 'rtl' } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="drivers/:id" element={<DriverDetailPage />} />
            <Route path="supervisors" element={<SupervisorsPage />} />
            <Route path="supervisors/:id" element={<SupervisorDetailPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="licenses" element={<LicensesPage />} />
            <Route path="licenses/:id" element={<LicenseDetailPage />} />
            <Route path="bank-accounts" element={<BankAccountsPage />} />
            <Route path="platform-accounts" element={<PlatformAccountsPage />} />
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="shifts/:id" element={<ShiftDetailPage />} />
            <Route path="fuel" element={<FuelLogsPage />} />
            <Route path="fuel/:id" element={<FuelLogDetailPage />} />
            <Route path="violations" element={<ViolationsPage />} />
            <Route path="violations/:id" element={<ViolationDetailPage />} />
            <Route path="incidents" element={<IncidentsPage />} />
            <Route path="incidents/:id" element={<IncidentDetailPage />} />
            <Route path="daily-reports" element={<DailyReportsPage />} />
            <Route path="daily-reports/:id" element={<DailyReportDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="investigations" element={<InvestigationsPage />} />
            <Route path="penalties" element={<PenaltiesPage />} />
            <Route path="ratings" element={<RatingsPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="leaves" element={<LeavesPage />} />
            <Route path="salary-advances" element={<SalaryAdvancesPage />} />
            <Route path="maintenance" element={<Navigate to="/maintenance-requests" replace />} />
            <Route path="maintenance-requests" element={<MaintenancePage />} />
            <Route path="maintenance-requests/:id" element={<MaintenanceRequestDetailPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
