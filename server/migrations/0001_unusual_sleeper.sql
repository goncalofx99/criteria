CREATE TYPE "public"."property_condition" AS ENUM('new', 'renovated', 'good', 'needs_renovation');--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "year_built_min" integer;--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "conditions" text[];--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "floor_min" integer;--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "floor_max" integer;--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "requires_balcony" boolean;--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "requires_central_heating" boolean;--> statement-breakpoint
ALTER TABLE "buyer_posts" ADD COLUMN "required_amenities" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "condition" "property_condition" DEFAULT 'good' NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "floor" integer;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "total_floors" integer;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "has_balcony" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "has_central_heating" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_posts" ADD COLUMN "amenities" text[] DEFAULT '{}' NOT NULL;