/**
 * Single registry for API v1 segments. Each router is mounted at:
 * - /api/v1/:segment (canonical)
 * - /api/v1/admin/:segment (dashboard / admin clients)
 * - /api/v1/mobile/:segment (mobile app team — same handlers, JWT decides access)
 */
const authRoutes = require('../modules/auth/routes');
const userRoutes = require('../modules/users/routes');
const supervisorRoutes = require('../modules/supervisors/routes');
const vehicleRoutes = require('../modules/vehicles/routes');
const documentRoutes = require('../modules/documents/routes');
const licenseRoutes = require('../modules/licenses/routes');
const bankAccountRoutes = require('../modules/bankAccounts/routes');
const platformRoutes = require('../modules/platforms/routes');
const platformAccountRoutes = require('../modules/platformAccounts/routes');
const shiftRoutes = require('../modules/shifts/routes');
const midShiftRoutes = require('../modules/midShiftRecords/routes');
const fuelLogRoutes = require('../modules/fuelLogs/routes');
const violationRoutes = require('../modules/violations/routes');
const incidentRoutes = require('../modules/incidents/routes');
const dailyReportRoutes = require('../modules/dailyReports/routes');
const notificationRoutes = require('../modules/notifications/routes');
const chatRoutes = require('../modules/chat/routes');
const investigationRoutes = require('../modules/investigations/routes');
const penaltyRoutes = require('../modules/penalties/routes');
const ratingRoutes = require('../modules/ratings/routes');
const rewardRoutes = require('../modules/rewards/routes');
const leaveRequestRoutes = require('../modules/leaveRequests/routes');
const salaryAdvanceRoutes = require('../modules/salaryAdvances/routes');
const maintenanceRequestRoutes = require('../modules/maintenanceRequests/routes');
const settingsRoutes = require('../modules/settings/routes');
const auditLogRoutes = require('../modules/auditLogs/routes');
const dashboardRoutes = require('../modules/dashboard/routes');
const reportsRoutes = require('../modules/reports/routes');
const adminUserRoutes = require('../modules/adminUsers/routes');

const v1RouteModules = [
  { segment: 'auth', router: authRoutes },
  { segment: 'users', router: userRoutes },
  { segment: 'supervisors', router: supervisorRoutes },
  { segment: 'vehicles', router: vehicleRoutes },
  { segment: 'documents', router: documentRoutes },
  { segment: 'licenses', router: licenseRoutes },
  { segment: 'bank-accounts', router: bankAccountRoutes },
  { segment: 'platforms', router: platformRoutes },
  { segment: 'platform-accounts', router: platformAccountRoutes },
  { segment: 'shifts', router: shiftRoutes },
  { segment: 'mid-shift-records', router: midShiftRoutes },
  { segment: 'fuel-logs', router: fuelLogRoutes },
  { segment: 'violations', router: violationRoutes },
  { segment: 'incidents', router: incidentRoutes },
  { segment: 'daily-reports', router: dailyReportRoutes },
  { segment: 'notifications', router: notificationRoutes },
  { segment: 'chat', router: chatRoutes },
  { segment: 'investigations', router: investigationRoutes },
  { segment: 'penalties', router: penaltyRoutes },
  { segment: 'ratings', router: ratingRoutes },
  { segment: 'rewards', router: rewardRoutes },
  { segment: 'leave-requests', router: leaveRequestRoutes },
  { segment: 'salary-advances', router: salaryAdvanceRoutes },
  { segment: 'maintenance-requests', router: maintenanceRequestRoutes },
  { segment: 'settings', router: settingsRoutes },
  { segment: 'audit-logs', router: auditLogRoutes },
  { segment: 'dashboard', router: dashboardRoutes },
  { segment: 'reports', router: reportsRoutes },
  { segment: 'admin-users', router: adminUserRoutes },
];

function mountV1Routes(app, apiV1Base = '/api/v1') {
  const prefixes = [apiV1Base, `${apiV1Base}/admin`, `${apiV1Base}/mobile`];
  prefixes.forEach((base) => {
    v1RouteModules.forEach(({ segment, router }) => {
      app.use(`${base}/${segment}`, router);
    });
  });
}

module.exports = { v1RouteModules, mountV1Routes };
