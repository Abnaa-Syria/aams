-- Operational daily reports + financial ledger snapshots

CREATE TABLE `daily_operational_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportDate` DATE NOT NULL,
    `cityId` INTEGER NULL,
    `status` ENUM('DRAFT', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
    `requiredOrders` INTEGER NULL,
    `achievedOrders` INTEGER NULL,
    `requiredOrdersManual` INTEGER NULL,
    `achievedOrdersManual` INTEGER NULL,
    `summaryNotes` TEXT NULL,
    `generatedBy` INTEGER NULL,
    `finalizedBy` INTEGER NULL,
    `finalizedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_operational_reports_reportDate_cityId_key`(`reportDate`, `cityId`),
    INDEX `daily_operational_reports_reportDate_idx`(`reportDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `operational_report_rows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `category` ENUM(
        'DEPLOYED', 'ON_LEAVE', 'ABSENT', 'SICK', 'LICENSE_FOLLOWUP',
        'MANAGEMENT', 'OPERATIONS_DEPT', 'MECHANICS', 'BOX_MANUFACTURING',
        'EXTERNAL_WORK', 'NOT_DEPLOYED', 'CUSTOM'
    ) NOT NULL,
    `platformOrders` JSON NULL,
    `notes` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isManual` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `operational_report_rows_reportId_idx`(`reportId`),
    INDEX `operational_report_rows_userId_idx`(`userId`),
    INDEX `operational_report_rows_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `daily_financial_ledgers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportDate` DATE NOT NULL,
    `status` ENUM('DRAFT', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
    `finalizedBy` INTEGER NULL,
    `finalizedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_financial_ledgers_reportDate_key`(`reportDate`),
    INDEX `daily_financial_ledgers_reportDate_idx`(`reportDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `financial_ledger_rows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ledgerId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `deductionsAmount` DECIMAL(12, 2) NULL,
    `deductionsNote` TEXT NULL,
    `violationsAmount` DECIMAL(12, 2) NULL,
    `violationsNote` TEXT NULL,
    `trafficAmount` DECIMAL(12, 2) NULL,
    `trafficNote` TEXT NULL,
    `rewardsAmount` DECIMAL(12, 2) NULL,
    `advancesAmount` DECIMAL(12, 2) NULL,
    `isManual` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_ledger_rows_ledgerId_userId_key`(`ledgerId`, `userId`),
    INDEX `financial_ledger_rows_ledgerId_idx`(`ledgerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `daily_operational_reports` ADD CONSTRAINT `daily_operational_reports_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `operational_report_rows` ADD CONSTRAINT `operational_report_rows_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `daily_operational_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `operational_report_rows` ADD CONSTRAINT `operational_report_rows_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `financial_ledger_rows` ADD CONSTRAINT `financial_ledger_rows_ledgerId_fkey` FOREIGN KEY (`ledgerId`) REFERENCES `daily_financial_ledgers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `financial_ledger_rows` ADD CONSTRAINT `financial_ledger_rows_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
