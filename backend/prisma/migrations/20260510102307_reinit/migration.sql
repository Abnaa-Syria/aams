/*
  Warnings:

  - You are about to drop the column `description` on the `system_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `system_settings` DROP COLUMN `description`,
    ADD COLUMN `category` VARCHAR(50) NULL,
    ADD COLUMN `descriptionAr` VARCHAR(500) NULL,
    ADD COLUMN `descriptionEn` VARCHAR(500) NULL,
    ADD COLUMN `isEditable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `isVisible` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `labelAr` VARCHAR(200) NULL,
    ADD COLUMN `labelEn` VARCHAR(200) NULL,
    ADD COLUMN `options` TEXT NULL,
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'text';

-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `assignedToId` INTEGER NULL,
    `lastReplyAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tickets_userId_idx`(`userId`),
    INDEX `tickets_status_idx`(`status`),
    INDEX `tickets_assignedToId_idx`(`assignedToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `message` TEXT NULL,
    `attachmentUrl` VARCHAR(500) NULL,
    `attachmentType` VARCHAR(50) NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_messages_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `system_settings_category_idx` ON `system_settings`(`category`);

-- CreateIndex
CREATE INDEX `system_settings_isVisible_idx` ON `system_settings`(`isVisible`);

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
