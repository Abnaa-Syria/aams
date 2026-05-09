-- CreateIndex
CREATE INDEX `violations_penaltyId_idx` ON `violations`(`penaltyId`);

-- AddForeignKey
ALTER TABLE `violations` ADD CONSTRAINT `violations_penaltyId_fkey` FOREIGN KEY (`penaltyId`) REFERENCES `penalties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
