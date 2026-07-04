-- Rename column `prefecture` to `location` on `posts` (data preserved)
ALTER TABLE `posts` RENAME COLUMN `prefecture` TO `location`;

-- Rename index accordingly
DROP INDEX `posts_prefecture_idx` ON `posts`;
CREATE INDEX `posts_location_idx` ON `posts`(`location`);
