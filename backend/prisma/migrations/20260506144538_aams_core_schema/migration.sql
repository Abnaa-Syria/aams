-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `identityNumber` VARCHAR(20) NOT NULL,
    `mobileNumber` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullNameAr` VARCHAR(150) NOT NULL,
    `fullNameEn` VARCHAR(150) NULL,
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `nationality` VARCHAR(80) NULL,
    `profileImageUrl` VARCHAR(500) NULL,
    `role` ENUM('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN', 'SUPERVISOR', 'DRIVER') NOT NULL DEFAULT 'DRIVER',
    `accountStatus` ENUM('ACTIVE', 'TEMPORARILY_SUSPENDED', 'RESTRICTED', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL', 'INCOMPLETE_PROFILE', 'ARCHIVED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `availabilityStatus` ENUM('AVAILABLE', 'ON_SHIFT', 'ON_LEAVE', 'OFF_DUTY') NOT NULL DEFAULT 'OFF_DUTY',
    `employmentStatus` ENUM('ON_DUTY', 'ON_LEAVE', 'SUSPENDED', 'RUNAWAY', 'FINAL_EXIT') NOT NULL DEFAULT 'ON_DUTY',
    `transportType` ENUM('CAR', 'MOTORCYCLE', 'TRUCK') NULL,
    `sevenHundredNumber` VARCHAR(50) NULL,
    `emergencyName` VARCHAR(150) NULL,
    `emergencyRelation` VARCHAR(100) NULL,
    `emergencyPhone` VARCHAR(20) NULL,
    `roomNumber` VARCHAR(50) NULL,
    `employeeNumber` VARCHAR(50) NULL,
    `joinDate` DATETIME(3) NULL,
    `contractEndDate` DATETIME(3) NULL,
    `jobTitle` VARCHAR(100) NULL,
    `cityId` INTEGER NULL,
    `regionId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `supervisorId` INTEGER NULL,
    `tags` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `otpCode` VARCHAR(10) NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_identityNumber_key`(`identityNumber`),
    UNIQUE INDEX `users_mobileNumber_key`(`mobileNumber`),
    UNIQUE INDEX `users_employeeNumber_key`(`employeeNumber`),
    INDEX `users_accountStatus_idx`(`accountStatus`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_supervisorId_idx`(`supervisorId`),
    INDEX `users_cityId_idx`(`cityId`),
    INDEX `users_employmentStatus_idx`(`employmentStatus`),
    INDEX `users_sevenHundredNumber_idx`(`sevenHundredNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_device_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `provider` ENUM('EXPO', 'FCM_LEGACY', 'WEB_PUSH', 'CUSTOM') NOT NULL DEFAULT 'EXPO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `push_device_tokens_token_key`(`token`),
    INDEX `push_device_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `ipAddress` VARCHAR(50) NULL,
    `userAgent` VARCHAR(500) NULL,
    `loginAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `success` BOOLEAN NOT NULL DEFAULT true,

    INDEX `login_activities_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(512) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(100) NOT NULL,
    `nameEn` VARCHAR(100) NULL,
    `region` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('NATIONAL_ID', 'IQAMA', 'PASSPORT', 'WORK_CONTRACT', 'RESIDENCE_PERMIT', 'BORDER_NUMBER', 'MUQEEM_ID', 'VISA', 'CONTRACT_WITH_SANAD', 'DRIVER_CARD', 'DRIVING_PERMIT', 'POLICE_CLEARANCE', 'WORK_INJURY', 'CLEARANCE_DOC', 'TERMINATION_DOC', 'HEALTH_CARD', 'MEDICAL_INSURANCE', 'OTHER') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `documentNumber` VARCHAR(100) NULL,
    `issueDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `status` ENUM('VALID', 'NEAR_EXPIRY', 'EXPIRED', 'UNDER_REVIEW', 'REJECTED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `fileUrl` VARCHAR(500) NULL,
    `fileName` VARCHAR(255) NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `documents_userId_idx`(`userId`),
    INDEX `documents_type_idx`(`type`),
    INDEX `documents_status_idx`(`status`),
    INDEX `documents_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('DRIVING_LICENSE', 'TRANSPORT_LICENSE', 'MEDICAL_CERTIFICATE', 'OTHER_CERTIFICATE') NOT NULL,
    `licenseNumber` VARCHAR(100) NULL,
    `title` VARCHAR(200) NOT NULL,
    `issueDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `status` ENUM('VALID', 'NEAR_EXPIRY', 'EXPIRED', 'UNDER_REVIEW', 'REJECTED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `fileUrl` VARCHAR(500) NULL,
    `fileName` VARCHAR(255) NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `licenses_userId_idx`(`userId`),
    INDEX `licenses_type_idx`(`type`),
    INDEX `licenses_status_idx`(`status`),
    INDEX `licenses_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bankName` VARCHAR(150) NOT NULL,
    `iban` VARCHAR(50) NOT NULL,
    `accountOwnerName` VARCHAR(200) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `verificationStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `proofFileUrl` VARCHAR(500) NULL,
    `proofFileName` VARCHAR(255) NULL,
    `paymentMethod` ENUM('BANK_TRANSFER', 'CASH') NOT NULL DEFAULT 'BANK_TRANSFER',
    `cashReceiptPhotoUrl` VARCHAR(500) NULL,
    `receivedStatus` ENUM('RECEIVED', 'NOT_RECEIVED') NULL,
    `receivedDate` DATETIME(3) NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `bank_accounts_userId_idx`(`userId`),
    INDEX `bank_accounts_paymentMethod_idx`(`paymentMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platforms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(100) NOT NULL,
    `nameEn` VARCHAR(100) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `platformId` INTEGER NOT NULL,
    `username` VARCHAR(150) NULL,
    `accountId` VARCHAR(150) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `notes` TEXT NULL,
    `fileUrl` VARCHAR(500) NULL,
    `isAlternate` BOOLEAN NOT NULL DEFAULT false,
    `alternateUsername` VARCHAR(150) NULL,
    `receiptDate` DATETIME(3) NULL,
    `returnDate` DATETIME(3) NULL,
    `startWorkDate` DATETIME(3) NULL,
    `verifiedBy` INTEGER NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `platform_accounts_userId_idx`(`userId`),
    INDEX `platform_accounts_platformId_idx`(`platformId`),
    INDEX `platform_accounts_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plateNumber` VARCHAR(20) NOT NULL,
    `manufacturer` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `year` INTEGER NULL,
    `color` VARCHAR(50) NULL,
    `odometerKm` INTEGER NULL,
    `status` ENUM('ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'RESERVED', 'DECOMMISSIONED') NOT NULL DEFAULT 'ACTIVE',
    `ownershipStatus` ENUM('COMPANY_OWNED', 'DRIVER_OWNED', 'LEASED', 'RENTED') NOT NULL DEFAULT 'COMPANY_OWNED',
    `insuranceCompany` VARCHAR(150) NULL,
    `insurancePolicyNo` VARCHAR(100) NULL,
    `insuranceStartDate` DATETIME(3) NULL,
    `insuranceExpiryDate` DATETIME(3) NULL,
    `registrationNumber` VARCHAR(100) NULL,
    `registrationExpiry` DATETIME(3) NULL,
    `registrationFileUrl` VARCHAR(500) NULL,
    `tankCapacity` INTEGER NULL,
    `fuelType` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `vehicles_plateNumber_key`(`plateNumber`),
    INDEX `vehicles_status_idx`(`status`),
    INDEX `vehicles_plateNumber_idx`(`plateNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `releasedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,

    INDEX `vehicle_assignments_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_assignments_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_odometer_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `shiftId` INTEGER NULL,
    `reading` INTEGER NOT NULL,
    `photoUrl` VARCHAR(500) NULL,
    `type` ENUM('START_SHIFT', 'END_SHIFT', 'MAINTENANCE', 'FUEL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vehicle_odometer_logs_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_odometer_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `platformAccountId` INTEGER NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'ENDED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` INTEGER NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectedBy` INTEGER NULL,
    `rejectionReason` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` TEXT NULL,
    `startPhotoUrl` VARCHAR(500) NULL,
    `startOdometer` INTEGER NULL,
    `startAppPhotoUrl` VARCHAR(500) NULL,
    `endPhotoUrl` VARCHAR(500) NULL,
    `endOdometer` INTEGER NULL,
    `endAppPhotoUrl` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `closureRequested` BOOLEAN NOT NULL DEFAULT false,
    `closureApprovedBy` INTEGER NULL,
    `closureApprovedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `shifts_userId_idx`(`userId`),
    INDEX `shifts_status_idx`(`status`),
    INDEX `shifts_requestedAt_idx`(`requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shift_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shiftId` INTEGER NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `performedBy` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `shift_logs_shiftId_idx`(`shiftId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mid_shift_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shiftId` INTEGER NOT NULL,
    `screenshotUrl` VARCHAR(500) NULL,
    `checklistData` JSON NULL,
    `notes` TEXT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mid_shift_records_shiftId_idx`(`shiftId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fuel_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `shiftId` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `liters` DECIMAL(10, 2) NULL,
    `fuelDate` DATETIME(3) NOT NULL,
    `receiptUrl` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `isDuplicate` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fuel_logs_userId_idx`(`userId`),
    INDEX `fuel_logs_vehicleId_idx`(`vehicleId`),
    INDEX `fuel_logs_shiftId_idx`(`shiftId`),
    INDEX `fuel_logs_fuelDate_idx`(`fuelDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `violations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NULL,
    `shiftId` INTEGER NULL,
    `amount` DECIMAL(10, 2) NULL,
    `reason` TEXT NOT NULL,
    `location` VARCHAR(300) NULL,
    `violationDate` DATETIME(3) NULL,
    `vehicleImageUrl` VARCHAR(500) NULL,
    `violationImageUrl` VARCHAR(500) NULL,
    `bikeImageUrl` VARCHAR(500) NULL,
    `status` ENUM('REPORTED', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'PENALIZED') NOT NULL DEFAULT 'REPORTED',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `penaltyId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `violations_userId_idx`(`userId`),
    INDEX `violations_vehicleId_idx`(`vehicleId`),
    INDEX `violations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `shiftId` INTEGER NULL,
    `type` ENUM('MEDICAL', 'ACCIDENT', 'BREAKDOWN', 'LARGE_ORDER', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `customType` VARCHAR(100) NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(300) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `caseNumber` VARCHAR(100) NULL,
    `insuranceClaimed` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceRequestId` INTEGER NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` INTEGER NULL,
    `resolutionNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `incidents_userId_idx`(`userId`),
    INDEX `incidents_status_idx`(`status`),
    INDEX `incidents_severity_idx`(`severity`),
    INDEX `incidents_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incident_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `incidentId` INTEGER NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileName` VARCHAR(255) NULL,
    `fileType` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `incident_attachments_incidentId_idx`(`incidentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `shiftId` INTEGER NULL,
    `reportDate` DATETIME(3) NOT NULL,
    `totalHours` DECIMAL(5, 2) NULL,
    `totalOrders` INTEGER NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION') NOT NULL DEFAULT 'SUBMITTED',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_reports_userId_idx`(`userId`),
    INDEX `daily_reports_reportDate_idx`(`reportDate`),
    INDEX `daily_reports_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_app_breakdowns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` INTEGER NOT NULL,
    `platformName` VARCHAR(100) NOT NULL,
    `orders` INTEGER NULL,
    `hours` DECIMAL(5, 2) NULL,
    `earnings` DECIMAL(10, 2) NULL,

    INDEX `report_app_breakdowns_reportId_idx`(`reportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_screenshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` INTEGER NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileName` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_screenshots_reportId_idx`(`reportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `body` TEXT NOT NULL,
    `category` ENUM('SYSTEM', 'SHIFT', 'DOCUMENT', 'COMPLIANCE', 'APPROVAL', 'ALERT', 'HR', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_isRead_idx`(`isRead`),
    INDEX `notifications_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `titleAr` VARCHAR(300) NOT NULL,
    `titleEn` VARCHAR(300) NULL,
    `bodyAr` TEXT NOT NULL,
    `bodyEn` TEXT NULL,

    UNIQUE INDEX `notification_templates_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_cycles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` ENUM('OPEN', 'PROCESSING', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_payrolls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `cycleId` INTEGER NOT NULL,
    `baseSalary` DECIMAL(10, 2) NOT NULL,
    `totalRewards` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalPenalties` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalAdvances` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `netSalary` DECIMAL(10, 2) NOT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `employee_payrolls_userId_cycleId_key`(`userId`, `cycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(500) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `tag` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_senderId_idx`(`senderId`),
    INDEX `chat_messages_receiverId_idx`(`receiverId`),
    INDEX `chat_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investigations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `details` TEXT NOT NULL,
    `status` ENUM('OPEN', 'PENDING_RESPONSE', 'UNDER_REVIEW', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `outcome` TEXT NULL,
    `employeeResponse` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `closedBy` INTEGER NULL,
    `internalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `investigations_userId_idx`(`userId`),
    INDEX `investigations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investigation_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `investigationId` INTEGER NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileName` VARCHAR(255) NULL,
    `uploadedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `investigation_attachments_investigationId_idx`(`investigationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investigation_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `investigationId` INTEGER NOT NULL,
    `action` VARCHAR(200) NOT NULL,
    `performedBy` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `investigation_events_investigationId_idx`(`investigationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penalties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('FINANCIAL', 'WARNING', 'SUSPENSION', 'TERMINATION', 'ASSET_DAMAGE', 'MISCONDUCT', 'OTHER') NOT NULL DEFAULT 'WARNING',
    `amount` DECIMAL(10, 2) NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPLIED', 'APPEALED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `penaltyDate` DATETIME(3) NOT NULL,
    `linkedEntity` VARCHAR(50) NULL,
    `linkedEntityId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdBy` INTEGER NULL,
    `approvedBy` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `penalties_userId_idx`(`userId`),
    INDEX `penalties_status_idx`(`status`),
    INDEX `penalties_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ratings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `ratedById` INTEGER NOT NULL,
    `overallScore` DECIMAL(3, 1) NOT NULL,
    `punctuality` DECIMAL(3, 1) NULL,
    `customerHandling` DECIMAL(3, 1) NULL,
    `communication` DECIMAL(3, 1) NULL,
    `compliance` DECIMAL(3, 1) NULL,
    `productivity` DECIMAL(3, 1) NULL,
    `period` VARCHAR(50) NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ratings_userId_idx`(`userId`),
    INDEX `ratings_ratedById_idx`(`ratedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rewards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(10, 2) NULL,
    `points` INTEGER NULL,
    `reason` TEXT NOT NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `visibleToDriver` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rewards_userId_idx`(`userId`),
    INDEX `rewards_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `leaveType` ENUM('ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'OTHER') NOT NULL,
    `year` INTEGER NOT NULL,
    `totalDays` INTEGER NOT NULL DEFAULT 0,
    `usedDays` INTEGER NOT NULL DEFAULT 0,
    `remainingDays` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_balances_userId_leaveType_year_key`(`userId`, `leaveType`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `leaveType` ENUM('ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'OTHER') NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `totalDays` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `leave_requests_userId_idx`(`userId`),
    INDEX `leave_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_advances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `notes` TEXT NULL,
    `numberOfMonths` INTEGER NULL DEFAULT 1,
    `installmentAmount` DECIMAL(10, 2) NULL,
    `deductFromCurrent` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `financeNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `salary_advances_userId_idx`(`userId`),
    INDEX `salary_advances_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `issueType` VARCHAR(100) NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `description` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(500) NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `technicianNotes` TEXT NULL,
    `adminNotes` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `maintenance_requests_userId_idx`(`userId`),
    INDEX `maintenance_requests_vehicleId_idx`(`vehicleId`),
    INDEX `maintenance_requests_status_idx`(`status`),
    INDEX `maintenance_requests_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(300) NULL,
    `group` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_data_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(50) NOT NULL,
    `nameAr` VARCHAR(100) NOT NULL,
    `nameEn` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `master_data_types_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(200) NOT NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(50) NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `ipAddress` VARCHAR(50) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(150) NOT NULL,
    `nameEn` VARCHAR(150) NULL,
    `type` ENUM('MOTORCYCLE', 'SAFETY_EQUIPMENT', 'PHONE', 'SIM_CARD', 'LICENSE_CARD', 'THERMAL_BOX', 'OTHER') NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('ASSIGNED', 'RETURNED', 'DAMAGED', 'LOST') NOT NULL DEFAULT 'ASSIGNED',
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,
    `condition` VARCHAR(100) NULL,
    `assignPhotoUrl` VARCHAR(500) NULL,
    `returnPhotoUrl` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `assignedBy` INTEGER NULL,
    `returnedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asset_assignments_assetId_idx`(`assetId`),
    INDEX `asset_assignments_userId_idx`(`userId`),
    INDEX `asset_assignments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `accuracy` DECIMAL(8, 2) NULL,
    `speed` DECIMAL(6, 2) NULL,
    `heading` DECIMAL(5, 2) NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `location_history_userId_idx`(`userId`),
    INDEX `location_history_recordedAt_idx`(`recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nameAr` VARCHAR(150) NOT NULL,
    `nameEn` VARCHAR(150) NULL,
    `description` TEXT NULL,
    `boundary` JSON NOT NULL,
    `isRestricted` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `alertMessage` VARCHAR(500) NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `break_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shiftId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `break_requests_shiftId_idx`(`shiftId`),
    INDEX `break_requests_userId_idx`(`userId`),
    INDEX `break_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('SUPERVISOR_COMPLAINT', 'EMPLOYEE_COMPLAINT') NOT NULL,
    `filedById` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `details` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attachmentUrl` VARCHAR(500) NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `complaints_filedById_idx`(`filedById`),
    INDEX `complaints_subjectId_idx`(`subjectId`),
    INDEX `complaints_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('BONUS', 'REVIEW', 'EXEMPTION', 'OBJECTION', 'VEHICLE_TRANSFER', 'SHIFT_TRANSFER', 'GOVERNMENT_ACTION', 'ASSET_RECEIPT', 'OTHER') NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `details` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(500) NULL,
    `attachmentName` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `admin_requests_userId_idx`(`userId`),
    INDEX `admin_requests_type_idx`(`type`),
    INDEX `admin_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `license_tests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `testDate` DATETIME(3) NULL,
    `result` ENUM('ADVANCED', 'INTERMEDIATE', 'BEGINNER', 'FAIL') NULL,
    `isRetest` BOOLEAN NOT NULL DEFAULT false,
    `previousTestId` INTEGER NULL,
    `notes` TEXT NULL,
    `scheduledBy` INTEGER NULL,
    `resultSetBy` INTEGER NULL,
    `resultSetAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `license_tests_userId_idx`(`userId`),
    INDEX `license_tests_result_idx`(`result`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `canceled_order_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `orderRef` VARCHAR(100) NULL,
    `reason` TEXT NOT NULL,
    `invoiceUrl` VARCHAR(500) NULL,
    `photoUrl` VARCHAR(500) NULL,
    `discountAmount` DECIMAL(10, 2) NULL,
    `platformName` VARCHAR(100) NULL,
    `orderDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `canceled_order_logs_userId_idx`(`userId`),
    INDEX `canceled_order_logs_orderDate_idx`(`orderDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trainees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `traineeId` INTEGER NOT NULL,
    `trainerId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `totalDays` INTEGER NOT NULL DEFAULT 30,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `rewardIssued` BOOLEAN NOT NULL DEFAULT false,
    `rewardAmount` DECIMAL(10, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `trainees_traineeId_idx`(`traineeId`),
    INDEX `trainees_trainerId_idx`(`trainerId`),
    INDEX `trainees_isCompleted_idx`(`isCompleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `substitute_vehicle_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `originalVehicleId` INTEGER NULL,
    `userId` INTEGER NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `assignedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `substitute_vehicle_assignments_vehicleId_idx`(`vehicleId`),
    INDEX `substitute_vehicle_assignments_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oil_change_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `odometerAtChange` INTEGER NOT NULL,
    `changeDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextDueOdometer` INTEGER NULL,
    `maintenanceReqId` INTEGER NULL,
    `notes` TEXT NULL,
    `performedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `oil_change_logs_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_swap_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shiftId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `currentVehicleId` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `newVehicleId` INTEGER NULL,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vehicle_swap_requests_shiftId_idx`(`shiftId`),
    INDEX `vehicle_swap_requests_userId_idx`(`userId`),
    INDEX `vehicle_swap_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduled_reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `targetUserId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `body` TEXT NOT NULL,
    `triggerDate` DATETIME(3) NOT NULL,
    `isSent` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
    `category` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `scheduled_reminders_targetUserId_idx`(`targetUserId`),
    INDEX `scheduled_reminders_triggerDate_idx`(`triggerDate`),
    INDEX `scheduled_reminders_isSent_idx`(`isSent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_device_tokens` ADD CONSTRAINT `push_device_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_activities` ADD CONSTRAINT `login_activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_accounts` ADD CONSTRAINT `platform_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_accounts` ADD CONSTRAINT `platform_accounts_platformId_fkey` FOREIGN KEY (`platformId`) REFERENCES `platforms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_assignments` ADD CONSTRAINT `vehicle_assignments_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_assignments` ADD CONSTRAINT `vehicle_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_odometer_logs` ADD CONSTRAINT `vehicle_odometer_logs_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_odometer_logs` ADD CONSTRAINT `vehicle_odometer_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_odometer_logs` ADD CONSTRAINT `vehicle_odometer_logs_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_platformAccountId_fkey` FOREIGN KEY (`platformAccountId`) REFERENCES `platform_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_logs` ADD CONSTRAINT `shift_logs_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mid_shift_records` ADD CONSTRAINT `mid_shift_records_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel_logs` ADD CONSTRAINT `fuel_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel_logs` ADD CONSTRAINT `fuel_logs_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fuel_logs` ADD CONSTRAINT `fuel_logs_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `violations` ADD CONSTRAINT `violations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `violations` ADD CONSTRAINT `violations_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `violations` ADD CONSTRAINT `violations_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incident_attachments` ADD CONSTRAINT `incident_attachments_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `incidents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_app_breakdowns` ADD CONSTRAINT `report_app_breakdowns_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `daily_reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_screenshots` ADD CONSTRAINT `report_screenshots_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `daily_reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_payrolls` ADD CONSTRAINT `employee_payrolls_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_payrolls` ADD CONSTRAINT `employee_payrolls_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `payroll_cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investigations` ADD CONSTRAINT `investigations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investigations` ADD CONSTRAINT `investigations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investigation_attachments` ADD CONSTRAINT `investigation_attachments_investigationId_fkey` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investigation_events` ADD CONSTRAINT `investigation_events_investigationId_fkey` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penalties` ADD CONSTRAINT `penalties_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_ratedById_fkey` FOREIGN KEY (`ratedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_advances` ADD CONSTRAINT `salary_advances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_history` ADD CONSTRAINT `location_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `break_requests` ADD CONSTRAINT `break_requests_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `break_requests` ADD CONSTRAINT `break_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_filedById_fkey` FOREIGN KEY (`filedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_requests` ADD CONSTRAINT `admin_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `license_tests` ADD CONSTRAINT `license_tests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canceled_order_logs` ADD CONSTRAINT `canceled_order_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainees` ADD CONSTRAINT `trainees_traineeId_fkey` FOREIGN KEY (`traineeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainees` ADD CONSTRAINT `trainees_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `substitute_vehicle_assignments` ADD CONSTRAINT `substitute_vehicle_assignments_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oil_change_logs` ADD CONSTRAINT `oil_change_logs_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_swap_requests` ADD CONSTRAINT `vehicle_swap_requests_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_swap_requests` ADD CONSTRAINT `vehicle_swap_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_swap_requests` ADD CONSTRAINT `vehicle_swap_requests_currentVehicleId_fkey` FOREIGN KEY (`currentVehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_reminders` ADD CONSTRAINT `scheduled_reminders_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_reminders` ADD CONSTRAINT `scheduled_reminders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
