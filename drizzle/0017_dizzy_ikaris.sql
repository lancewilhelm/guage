ALTER TABLE "role_plays" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "role_plays" CASCADE;--> statement-breakpoint
ALTER TABLE "messages" RENAME COLUMN "session_id" TO "chat_id";--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_session_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;