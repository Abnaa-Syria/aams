-- Client features phase 3: PermissionRequest, work history, OTHER details, enum extensions

-- AppUser (required before permission_requests.appUserId FK)
CREATE TABLE `app_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `appRole` ENUM('DRIVER', 'SUPERVISOR') NOT NULL DEFAULT 'DRIVER',
    `availabilityStatus` ENUM('AVAILABLE', 'ON_SHIFT', 'ON_LEAVE', 'OFF_DUTY') NOT NULL DEFAULT 'OFF_DUTY',
    `employmentStatus` ENUM('ON_DUTY', 'ON_LEAVE', 'SUSPENDED', 'RUNAWAY', 'FINAL_EXIT') NOT NULL DEFAULT 'ON_DUTY',
    `transportType` ENUM('CAR', 'MOTORCYCLE', 'TRUCK') NULL,
    `supervisorId` INTEGER NULL,
    `sevenHundredNumber` VARCHAR(50) NULL,
    `roomNumber` VARCHAR(50) NULL,
    `tags` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_users_userId_key`(`userId`),
    INDEX `app_users_userId_idx`(`userId`),
    INDEX `app_users_appRole_idx`(`appRole`),
    INDEX `app_users_supervisorId_idx`(`supervisorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_users` ADD CONSTRAINT `app_users_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `app_users` ADD CONSTRAINT `app_users_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend LicenseType enum
ALTER TABLE `licenses`
  MODIFY `type` ENUM(
    'DRIVING_LICENSE',
    'TRANSPORT_LICENSE',
    'MEDICAL_CERTIFICATE',
    'OTHER_CERTIFICATE',
    'COMMERCIAL_REGISTRATION',
    'DEFENSIVE_DRIVING',
    'FIRST_AID',
    'FOOD_HANDLER',
    'HEAVY_VEHICLE'
  ) NOT NULL;

ALTER TABLE `licenses` ADD COLUMN `otherDetails` VARCHAR(500) NULL;

-- Extend AssetType enum
ALTER TABLE `assets`
  MODIFY `type` ENUM(
    'MOTORCYCLE',
    'SAFETY_EQUIPMENT',
    'PHONE',
    'SIM_CARD',
    'LICENSE_CARD',
    'THERMAL_BOX',
    'HELMET',
    'UNIFORM',
    'CHARGER',
    'TABLET',
    'OTHER'
  ) NOT NULL;

ALTER TABLE `assets` ADD COLUMN `otherDetails` VARCHAR(500) NULL;

ALTER TABLE `documents` ADD COLUMN `otherDetails` VARCHAR(500) NULL;

-- Permission requests (#9)
CREATE TABLE `permission_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `appUserId` INTEGER NULL,
    `permissionDate` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(10) NULL,
    `endTime` VARCHAR(10) NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `permission_requests_userId_idx`(`userId`),
    INDEX `permission_requests_appUserId_idx`(`appUserId`),
    INDEX `permission_requests_status_idx`(`status`),
    INDEX `permission_requests_permissionDate_idx`(`permissionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Platform account work history (#4)
CREATE TABLE `platform_account_work_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platformAccountId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `assignedBy` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platform_account_work_history_platformAccountId_idx`(`platformAccountId`),
    INDEX `platform_account_work_history_startDate_idx`(`startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `platform_account_work_history` ADD CONSTRAINT `platform_account_work_history_platformAccountId_fkey` FOREIGN KEY (`platformAccountId`) REFERENCES `platform_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
