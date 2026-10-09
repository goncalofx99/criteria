ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp;
UPDATE "users" SET "onboarding_completed_at" = NOW() WHERE "password_hash" IS NOT NULL;
