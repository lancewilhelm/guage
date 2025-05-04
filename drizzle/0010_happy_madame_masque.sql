ALTER TABLE `knowledge` ADD `documents` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge` ADD `chunks` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge` DROP COLUMN `details`;