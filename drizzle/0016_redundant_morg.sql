ALTER TABLE "chat_sessions" RENAME TO "chats";--> statement-breakpoint
ALTER TABLE "role_play_sessions" RENAME TO "role_plays";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chat_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_session_id_chat_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "role_plays" DROP CONSTRAINT "role_play_sessions_session_id_chat_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "deleted" boolean;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted" boolean;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_chats_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_plays" ADD CONSTRAINT "role_plays_session_id_chats_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "conversation_type";