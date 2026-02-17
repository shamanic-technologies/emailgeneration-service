ALTER TABLE "email_generations" DROP COLUMN IF EXISTS "lead_first_name";--> statement-breakpoint
ALTER TABLE "email_generations" DROP COLUMN IF EXISTS "lead_last_name";--> statement-breakpoint
ALTER TABLE "email_generations" DROP COLUMN IF EXISTS "lead_company";--> statement-breakpoint
ALTER TABLE "email_generations" DROP COLUMN IF EXISTS "lead_title";--> statement-breakpoint
ALTER TABLE "email_generations" DROP COLUMN IF EXISTS "client_company_name";--> statement-breakpoint
ALTER TABLE "email_generations" DROP COLUMN IF EXISTS "client_company_description";--> statement-breakpoint
ALTER TABLE "prompts" DROP COLUMN IF EXISTS "variables";