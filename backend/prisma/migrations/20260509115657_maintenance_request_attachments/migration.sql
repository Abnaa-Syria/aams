-- CreateTable
CREATE TABLE `maintenance_request_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maintenanceRequestId` INTEGER NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileName` VARCHAR(255) NULL,
    `fileType` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `maintenance_request_attachments_maintenanceRequestId_idx`(`maintenanceRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `maintenance_request_attachments` ADD CONSTRAINT `maintenance_request_attachments_maintenanceRequestId_fkey` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy attachmentUrl
INSERT INTO `maintenance_request_attachments` (`maintenanceRequestId`, `fileUrl`, `fileName`, `fileType`, `createdAt`)
SELECT `id`, `attachmentUrl`, NULL, NULL, NOW(3)
FROM `maintenance_requests`
WHERE `attachmentUrl` IS NOT NULL AND `attachmentUrl` != '';
