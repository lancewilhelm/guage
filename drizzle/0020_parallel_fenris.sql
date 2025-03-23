ALTER TABLE "chats" ADD COLUMN "active_branch" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "deleted";