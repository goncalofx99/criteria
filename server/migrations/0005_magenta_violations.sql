CREATE TABLE "account_action_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_email" text,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_action_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "account_action_kind_check" CHECK ("account_action_tokens"."action" IN ('email_current', 'email_new', 'delete'))
);
--> statement-breakpoint
CREATE TABLE "account_deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_deletion_jobs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "account_action_tokens" ADD CONSTRAINT "account_action_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_action_user_created_idx" ON "account_action_tokens" USING btree ("user_id","created_at");