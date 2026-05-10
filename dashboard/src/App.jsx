import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import DashboardLayout from './layouts/DashboardLayout';
import PermissionRoute from './routes/PermissionRoute';
import { PERMISSIONS as P, DASHBOARD_VIEW_PERMISSIONS } from './utils/rolePermissions';

import LoginPage from './pages/auth/LoginPage';
import UnauthorizedPage from './pages/unauthorized/UnauthorizedPage';
import DashboardHome from './pages/dashboard/DashboardHome';
import DriversPage from './pages/drivers/DriversPage';
import DriverDetailPage from './pages/drivers/DriverDetailPage';
import SupervisorsPage from './pages/supervisors/SupervisorsPage';
import SupervisorDetailPage from './pages/supervisors/SupervisorDetailPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import VehicleDetailPage from './pages/vehicles/VehicleDetailPage';
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
import TicketsPage from './pages/tickets/TicketsPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import ChatPage from './pages/chat/ChatPage';
import InvestigationsPage from './pages/investigations/InvestigationsPage';
import InvestigationDetailPage from './pages/investigations/InvestigationDetailPage';
import PenaltiesPage from './pages/penalties/PenaltiesPage';
import PenaltyDetailPage from './pages/penalties/PenaltyDetailPage';
import RatingsPage from './pages/ratings/RatingsPage';
import RatingDetailPage from './pages/ratings/RatingDetailPage';
import RewardsPage from './pages/rewards/RewardsPage';
import RewardDetailPage from './pages/rewards/RewardDetailPage';
import LeavesPage from './pages/leaves/LeavesPage';
import LeaveDetailPage from './pages/leaves/LeaveDetailPage';
import SalaryAdvancesPage from './pages/salary-advances/SalaryAdvancesPage';
import SalaryAdvanceDetailPage from './pages/salary-advances/SalaryAdvanceDetailPage';
import PlatformAccountDetailPage from './pages/platform-accounts/PlatformAccountDetailPage';
import BankAccountDetailPage from './pages/bank-accounts/BankAccountDetailPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import MaintenanceRequestDetailPage from './pages/maintenance/MaintenanceRequestDetailPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminsPage from './pages/admins/AdminsPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';
import RolesPermissionsPage from './pages/roles-permissions/RolesPermissionsPage';
import SocketTestPage from './pages/settings/SocketTestPage';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Almarai', direction: 'rtl' } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<PermissionRoute anyOf={DASHBOARD_VIEW_PERMISSIONS}><DashboardHome /></PermissionRoute>} />
            <Route path="drivers" element={<PermissionRoute anyOf={[P.USERS_READ]}><DriversPage /></PermissionRoute>} />
            <Route path="drivers/:id" element={<PermissionRoute anyOf={[P.USERS_READ]}><DriverDetailPage /></PermissionRoute>} />
            <Route path="supervisors" element={<PermissionRoute anyOf={[P.USERS_READ]}><SupervisorsPage /></PermissionRoute>} />
            <Route path="supervisors/:id" element={<PermissionRoute anyOf={[P.USERS_READ]}><SupervisorDetailPage /></PermissionRoute>} />
            <Route path="vehicles" element={<PermissionRoute anyOf={[P.FLEET_READ]}><VehiclesPage /></PermissionRoute>} />
            <Route path="vehicles/:id" element={<PermissionRoute anyOf={[P.FLEET_READ]}><VehicleDetailPage /></PermissionRoute>} />
            <Route path="documents" element={<PermissionRoute anyOf={[P.DOCUMENTS_READ]}><DocumentsPage /></PermissionRoute>} />
            <Route path="documents/:id" element={<PermissionRoute anyOf={[P.DOCUMENTS_READ]}><DocumentDetailPage /></PermissionRoute>} />
            <Route path="licenses" element={<PermissionRoute anyOf={[P.DOCUMENTS_READ]}><LicensesPage /></PermissionRoute>} />
            <Route path="licenses/:id" element={<PermissionRoute anyOf={[P.DOCUMENTS_READ]}><LicenseDetailPage /></PermissionRoute>} />
            <Route path="bank-accounts" element={<PermissionRoute anyOf={[P.FINANCE_READ]}><BankAccountsPage /></PermissionRoute>} />
            <Route path="bank-accounts/:id" element={<PermissionRoute anyOf={[P.FINANCE_READ]}><BankAccountDetailPage /></PermissionRoute>} />
            <Route path="platform-accounts" element={<PermissionRoute anyOf={[P.FLEET_READ]}><PlatformAccountsPage /></PermissionRoute>} />
            <Route path="platform-accounts/:id" element={<PermissionRoute anyOf={[P.FLEET_READ]}><PlatformAccountDetailPage /></PermissionRoute>} />
            <Route path="shifts" element={<PermissionRoute anyOf={[P.SHIFTS_READ]}><ShiftsPage /></PermissionRoute>} />
            <Route path="shifts/:id" element={<PermissionRoute anyOf={[P.SHIFTS_READ]}><ShiftDetailPage /></PermissionRoute>} />
            <Route path="fuel" element={<PermissionRoute anyOf={[P.FLEET_READ]}><FuelLogsPage /></PermissionRoute>} />
            <Route path="fuel/:id" element={<PermissionRoute anyOf={[P.FLEET_READ]}><FuelLogDetailPage /></PermissionRoute>} />
            <Route path="violations" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><ViolationsPage /></PermissionRoute>} />
            <Route path="violations/:id" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><ViolationDetailPage /></PermissionRoute>} />
            <Route path="incidents" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><IncidentsPage /></PermissionRoute>} />
            <Route path="incidents/:id" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><IncidentDetailPage /></PermissionRoute>} />
            <Route path="daily-reports" element={<PermissionRoute anyOf={[P.SHIFTS_READ]}><DailyReportsPage /></PermissionRoute>} />
            <Route path="daily-reports/:id" element={<PermissionRoute anyOf={[P.SHIFTS_READ]}><DailyReportDetailPage /></PermissionRoute>} />
            <Route path="notifications" element={<PermissionRoute anyOf={[P.USERS_READ]}><NotificationsPage /></PermissionRoute>} />
            <Route path="tickets" element={<PermissionRoute anyOf={[P.USERS_READ]}><TicketsPage /></PermissionRoute>} />
            <Route path="tickets/:id" element={<PermissionRoute anyOf={[P.USERS_READ]}><TicketDetailPage /></PermissionRoute>} />
            <Route path="chat" element={<PermissionRoute anyOf={[P.USERS_READ]}><ChatPage /></PermissionRoute>} />
            <Route path="investigations" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><InvestigationsPage /></PermissionRoute>} />
            <Route path="investigations/:id" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><InvestigationDetailPage /></PermissionRoute>} />
            <Route path="penalties" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><PenaltiesPage /></PermissionRoute>} />
            <Route path="penalties/:id" element={<PermissionRoute anyOf={[P.COMPLIANCE_READ]}><PenaltyDetailPage /></PermissionRoute>} />
            <Route path="ratings" element={<PermissionRoute anyOf={[P.FLEET_READ]}><RatingsPage /></PermissionRoute>} />
            <Route path="ratings/:id" element={<PermissionRoute anyOf={[P.FLEET_READ]}><RatingDetailPage /></PermissionRoute>} />
            <Route path="rewards" element={<PermissionRoute anyOf={[P.HR_READ]}><RewardsPage /></PermissionRoute>} />
            <Route path="rewards/:id" element={<PermissionRoute anyOf={[P.HR_READ]}><RewardDetailPage /></PermissionRoute>} />
            <Route path="leaves" element={<PermissionRoute anyOf={[P.HR_READ]}><LeavesPage /></PermissionRoute>} />
            <Route path="leaves/:id" element={<PermissionRoute anyOf={[P.HR_READ]}><LeaveDetailPage /></PermissionRoute>} />
            <Route path="salary-advances" element={<PermissionRoute anyOf={[P.FINANCE_READ]}><SalaryAdvancesPage /></PermissionRoute>} />
            <Route path="salary-advances/:id" element={<PermissionRoute anyOf={[P.FINANCE_READ]}><SalaryAdvanceDetailPage /></PermissionRoute>} />
            <Route path="maintenance" element={<Navigate to="/maintenance-requests" replace />} />
            <Route path="maintenance-requests" element={<PermissionRoute anyOf={[P.INVENTORY_READ]}><MaintenancePage /></PermissionRoute>} />
            <Route path="maintenance-requests/:id" element={<PermissionRoute anyOf={[P.INVENTORY_READ]}><MaintenanceRequestDetailPage /></PermissionRoute>} />
            <Route path="analytics" element={<PermissionRoute anyOf={DASHBOARD_VIEW_PERMISSIONS}><AnalyticsPage /></PermissionRoute>} />
            <Route path="settings" element={<PermissionRoute anyOf={[P.SETTINGS_READ]}><SettingsPage /></PermissionRoute>} />
            <Route path="admins" element={<PermissionRoute anyOf={[P.USERS_WRITE]}><AdminsPage /></PermissionRoute>} />
            <Route path="audit-logs" element={<PermissionRoute anyOf={[P.AUDIT_READ]}><AuditLogsPage /></PermissionRoute>} />
            <Route path="roles-permissions" element={<PermissionRoute anyOf={[P.ROLE_MANAGEMENT]}><RolesPermissionsPage /></PermissionRoute>} />
            <Route path="socket-test" element={<SocketTestPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
