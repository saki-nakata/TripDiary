-- AlterTable
ALTER TABLE `posts` ADD COLUMN `commentCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `followerCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `followingCount` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `posts_likeCount_idx` ON `posts`(`likeCount` DESC);

-- Backfill existing rows: 新規カラムはデフォルト0で作成されるため、既存データの実カウントを反映する
UPDATE `posts` p
SET p.`likeCount` = (SELECT COUNT(*) FROM `likes` l WHERE l.`postId` = p.`id`),
    p.`commentCount` = (SELECT COUNT(*) FROM `comments` c WHERE c.`postId` = p.`id`);

UPDATE `users` u
SET u.`followerCount` = (SELECT COUNT(*) FROM `follows` f WHERE f.`followingId` = u.`id`),
    u.`followingCount` = (SELECT COUNT(*) FROM `follows` f WHERE f.`followerId` = u.`id`);
