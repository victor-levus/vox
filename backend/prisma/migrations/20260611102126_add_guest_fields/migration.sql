-- AlterTable
ALTER TABLE `User` ADD COLUMN `isGuest` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `organisation` VARCHAR(191) NULL;
