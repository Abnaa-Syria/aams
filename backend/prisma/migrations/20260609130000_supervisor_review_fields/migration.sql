-- AlterTable
ALTER TABLE `leave_requests`
  ADD COLUMN `supervisorReviewedBy` INTEGER NULL,
  ADD COLUMN `supervisorReviewedAt` DATETIME(3) NULL,
  ADD COLUMN `supervisorReviewNotes` TEXT NULL,
  ADD COLUMN `supervisorApproved` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `salary_advances`
  ADD COLUMN `supervisorReviewedBy` INTEGER NULL,
  ADD COLUMN `supervisorReviewedAt` DATETIME(3) NULL,
  ADD COLUMN `supervisorReviewNotes` TEXT NULL,
  ADD COLUMN `supervisorApproved` BOOLEAN NOT NULL DEFAULT false;
