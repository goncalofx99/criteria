CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_refresh_token_idx" ON "sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "bp_buyer_id_idx" ON "buyer_posts" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "bp_active_created_idx" ON "buyer_posts" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE INDEX "bp_type_active_idx" ON "buyer_posts" USING btree ("property_type","is_active");--> statement-breakpoint
CREATE INDEX "bp_lat_lng_idx" ON "buyer_posts" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "conv_buyer_id_idx" ON "conversations" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "conv_seller_id_idx" ON "conversations" USING btree ("seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conv_buyer_post_seller_idx" ON "conversations" USING btree ("buyer_post_id","seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conv_seller_post_buyer_idx" ON "conversations" USING btree ("seller_post_id","buyer_id");--> statement-breakpoint
CREATE INDEX "msg_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "sp_seller_id_idx" ON "seller_posts" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "sp_active_created_idx" ON "seller_posts" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE INDEX "sp_type_active_idx" ON "seller_posts" USING btree ("property_type","is_active");--> statement-breakpoint
CREATE INDEX "sp_lat_lng_idx" ON "seller_posts" USING btree ("lat","lng");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "one_post_set" CHECK ((buyer_post_id IS NOT NULL) != (seller_post_id IS NOT NULL));