CREATE TABLE IF NOT EXISTS "content_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"app_id" text NOT NULL,
	"type" text NOT NULL,
	"key_mode" text NOT NULL,
	"prompt" text NOT NULL,
	"variables" jsonb,
	"include_footer" boolean,
	"subject" text,
	"body_html" text,
	"body_text" text,
	"title" text,
	"description" text,
	"location" text,
	"generation_run_id" text,
	"parent_run_id" text,
	"model" text DEFAULT 'claude-opus-4-6' NOT NULL,
	"tokens_input" integer,
	"tokens_output" integer,
	"prompt_raw" text,
	"response_raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contentgen_org" ON "content_generations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contentgen_app" ON "content_generations" USING btree ("app_id");