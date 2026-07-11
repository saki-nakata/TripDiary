/*
  Warnings:

  - The primary key for the `plan_spots` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `plan_spots` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateIndex (support planId FK before dropping the composite primary key)
CREATE INDEX `plan_spots_planId_idx` ON `plan_spots`(`planId`);

-- AlterTable
ALTER TABLE `plan_spots` DROP PRIMARY KEY,
    ADD COLUMN `freeCategory` VARCHAR(20) NULL,
    ADD COLUMN `freeLocation` VARCHAR(50) NULL,
    ADD COLUMN `freeTitle` VARCHAR(60) NULL,
    ADD COLUMN `id` VARCHAR(191) NULL,
    MODIFY `postId` VARCHAR(191) NULL;

-- Backfill id for existing rows
UPDATE `plan_spots` SET `id` = UUID() WHERE `id` IS NULL;

-- Finalize id column
ALTER TABLE `plan_spots` MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);
