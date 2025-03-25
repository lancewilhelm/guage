ALTER TABLE "settings" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "id";