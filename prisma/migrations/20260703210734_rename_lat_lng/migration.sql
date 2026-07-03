/*
  Warnings:

  - You are about to drop the column `latitude` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `posts` DROP COLUMN `latitude`,
    DROP COLUMN `longitude`,
    ADD COLUMN `lat` DOUBLE NULL,
    ADD COLUMN `lng` DOUBLE NULL;
