ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");