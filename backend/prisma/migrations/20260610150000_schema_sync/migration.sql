-- Sync schema fields missing from earlier migrations (post User/AppUser split)

-- Platform accounts
ALTER TABLE `platform_accounts` ADD COLUMN `accountScreenshotUrl` VARCHAR(500) NULL;

-- Shifts: scheduling photos + app user link
ALTER TABLE `shifts`
  ADD COLUMN `appUserId` INTEGER NULL,
  ADD COLUMN `requestedStartTime` DATETIME(3) NULL,
  ADD COLUMN `requestedEndTime` DATETIME(3) NULL,
  ADD COLUMN `startVehiclePhotoUrl` VARCHAR(500) NULL;

ALTER TABLE `shifts` ADD CONSTRAINT `shifts_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Operational tables: appUserId
ALTER TABLE `fuel_logs` ADD COLUMN `appUserId` INTEGER NULL;
CREATE INDEX `fuel_logs_appUserId_idx` ON `fuel_logs`(`appUserId`);
ALTER TABLE `fuel_logs` ADD CONSTRAINT `fuel_logs_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `violations`
  ADD COLUMN `appUserId` INTEGER NULL,
  ADD COLUMN `driverComment` TEXT NULL;
CREATE INDEX `violations_appUserId_idx` ON `violations`(`appUserId`);
ALTER TABLE `violations` ADD CONSTRAINT `violations_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `incidents` ADD COLUMN `appUserId` INTEGER NULL;
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `daily_reports` ADD COLUMN `appUserId` INTEGER NULL;
CREATE INDEX `daily_reports_appUserId_idx` ON `daily_reports`(`appUserId`);
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `report_app_breakdowns` ADD COLUMN `screenshotUrl` VARCHAR(500) NULL;

ALTER TABLE `penalties` ADD COLUMN `appUserId` INTEGER NULL;
CREATE INDEX `penalties_appUserId_idx` ON `penalties`(`appUserId`);
ALTER TABLE `penalties` ADD CONSTRAINT `penalties_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `rewards` ADD COLUMN `appUserId` INTEGER NULL;
CREATE INDEX `rewards_appUserId_idx` ON `rewards`(`appUserId`);
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `leave_requests` ADD COLUMN `appUserId` INTEGER NULL;
CREATE INDEX `leave_requests_appUserId_idx` ON `leave_requests`(`appUserId`);
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `salary_advances`
  ADD COLUMN `appUserId` INTEGER NULL,
  ADD COLUMN `deductionType` VARCHAR(50) NULL;
CREATE INDEX `salary_advances_appUserId_idx` ON `salary_advances`(`appUserId`);
ALTER TABLE `salary_advances` ADD CONSTRAINT `salary_advances_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `maintenance_requests` ADD COLUMN `appUserId` INTEGER NULL;
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Canceled orders: link to shift / platform account
ALTER TABLE `canceled_order_logs`
  ADD COLUMN `shiftId` INTEGER NULL,
  ADD COLUMN `platformAccountId` INTEGER NULL;
CREATE INDEX `canceled_order_logs_shiftId_idx` ON `canceled_order_logs`(`shiftId`);
CREATE INDEX `canceled_order_logs_platformAccountId_idx` ON `canceled_order_logs`(`platformAccountId`);
ALTER TABLE `canceled_order_logs` ADD CONSTRAINT `canceled_order_logs_shiftId_fkey`
  FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `canceled_order_logs` ADD CONSTRAINT `canceled_order_logs_platformAccountId_fkey`
  FOREIGN KEY (`platformAccountId`) REFERENCES `platform_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Oil change performer
CREATE INDEX `oil_change_logs_performedBy_idx` ON `oil_change_logs`(`performedBy`);
ALTER TABLE `oil_change_logs` ADD CONSTRAINT `oil_change_logs_performedBy_fkey`
  FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Substitute vehicles
CREATE INDEX `substitute_vehicle_assignments_userId_idx` ON `substitute_vehicle_assignments`(`userId`);
CREATE INDEX `substitute_vehicle_assignments_assignedBy_idx` ON `substitute_vehicle_assignments`(`assignedBy`);
ALTER TABLE `substitute_vehicle_assignments` ADD CONSTRAINT `substitute_vehicle_assignments_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `substitute_vehicle_assignments` ADD CONSTRAINT `substitute_vehicle_assignments_assignedBy_fkey`
  FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Vehicle swap reviewer / new vehicle
CREATE INDEX `vehicle_swap_requests_newVehicleId_idx` ON `vehicle_swap_requests`(`newVehicleId`);
CREATE INDEX `vehicle_swap_requests_reviewedBy_idx` ON `vehicle_swap_requests`(`reviewedBy`);
ALTER TABLE `vehicle_swap_requests` ADD CONSTRAINT `vehicle_swap_requests_newVehicleId_fkey`
  FOREIGN KEY (`newVehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `vehicle_swap_requests` ADD CONSTRAINT `vehicle_swap_requests_reviewedBy_fkey`
  FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
