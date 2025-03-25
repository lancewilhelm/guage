CREATE TABLE "global_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DROP TABLE "settings" CASCADE;