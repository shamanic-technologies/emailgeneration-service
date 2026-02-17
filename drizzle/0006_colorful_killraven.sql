CREATE TABLE IF NOT EXISTS "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" text NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_generations" ALTER COLUMN "apollo_enrichment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_generations" ADD COLUMN "prompt_type" text;--> statement-breakpoint
ALTER TABLE "email_generations" ADD COLUMN "variables_raw" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_prompts_app_type" ON "prompts" USING btree ("app_id","type");