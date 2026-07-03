/*
  Warnings:

  - You are about to drop the column `areaTag` on the `posts` table. All the data in the column will be lost.
  - Made the column `prefecture` on table `posts` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `posts_areaTag_idx` ON `posts`;

-- AlterTable
ALTER TABLE `posts` DROP COLUMN `areaTag`,
    MODIFY `prefecture` VARCHAR(50) NOT NULL;

-- CreateIndex
CREATE INDEX `posts_prefecture_idx` ON `posts`(`prefecture`);
