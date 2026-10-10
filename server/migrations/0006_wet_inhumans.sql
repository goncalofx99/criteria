CREATE TABLE "pending_signups" (
	"email" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text,
	"role" "user_role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_signups_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "pending_signup_expiry_idx" ON "pending_signups" USING btree ("expires_at");