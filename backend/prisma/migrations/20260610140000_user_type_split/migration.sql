-- Split admin vs app users: userType + admin-only role enum + backfill app_users

ALTER TABLE `users`
  ADD COLUMN `userType` ENUM('ADMIN', 'APP_USER') NOT NULL DEFAULT 'ADMIN';

UPDATE `users`
SET `userType` = 'APP_USER'
WHERE `role` IN ('DRIVER', 'SUPERVISOR');

-- Backfill app_users from legacy role before shrinking enum
INSERT INTO `app_users` (
  `userId`,
  `appRole`,
  `availabilityStatus`,
  `employmentStatus`,
  `transportType`,
  `sevenHundredNumber`,
  `roomNumber`,
  `tags`,
  `notes`,
  `createdAt`,
  `updatedAt`
)
SELECT
  u.`id`,
  u.`role`,
  u.`availabilityStatus`,
  u.`employmentStatus`,
  u.`transportType`,
  u.`sevenHundredNumber`,
  u.`roomNumber`,
  u.`tags`,
  u.`notes`,
  u.`createdAt`,
  u.`updatedAt`
FROM `users` u
WHERE u.`userType` = 'APP_USER'
  AND u.`deletedAt` IS NULL
  AND NOT EXISTS (SELECT 1 FROM `app_users` au WHERE au.`userId` = u.`id`);

-- Map supervisorId (users.id) -> app_users.id
UPDATE `app_users` au
INNER JOIN `users` u ON u.`id` = au.`userId`
INNER JOIN `app_users` sup ON sup.`userId` = u.`supervisorId`
SET au.`supervisorId` = sup.`id`
WHERE u.`supervisorId` IS NOT NULL;

UPDATE `users` SET `role` = NULL WHERE `userType` = 'APP_USER';

ALTER TABLE `users`
  MODIFY `role` ENUM(
    'SUPER_ADMIN',
    'OPERATIONS_ADMIN',
    'HR_ADMIN',
    'FLEET_ADMIN',
    'FINANCE_ADMIN'
  ) NULL;
