-- AlterTable
ALTER TABLE `user` ADD COLUMN `isGuest` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `organisation` VARCHAR(191) NULL;
