-- AlterTable
ALTER TABLE `shifts` ADD COLUMN `lastLat` DOUBLE NULL,
    ADD COLUMN `lastLng` DOUBLE NULL,
    ADD COLUMN `lastLocationAt` DATETIME(3) NULL;
