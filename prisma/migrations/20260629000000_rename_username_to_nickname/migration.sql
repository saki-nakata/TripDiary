ALTER TABLE `users` RENAME COLUMN `username` TO `nickname`;
ALTER TABLE `users` MODIFY COLUMN `nickname` VARCHAR(20) NOT NULL;
