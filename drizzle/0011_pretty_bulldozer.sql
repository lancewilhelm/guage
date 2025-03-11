ALTER TABLE "chat_sessions" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;