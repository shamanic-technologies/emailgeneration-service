ALTER TABLE "email_generations" ADD COLUMN "app_id" text;--> statement-breakpoint
ALTER TABLE "email_generations" ADD COLUMN "brand_id" text;--> statement-breakpoint
ALTER TABLE "email_generations" ADD COLUMN "campaign_id" text;--> statement-breakpoint
UPDATE "email_generations" SET "app_id" = '', "brand_id" = '', "campaign_id" = '' WHERE "app_id" IS NULL;--> statement-breakpoint
ALTER TABLE "email_generations" ALTER COLUMN "app_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_generations" ALTER COLUMN "brand_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_generations" ALTER COLUMN "campaign_id" SET NOT NULL;
