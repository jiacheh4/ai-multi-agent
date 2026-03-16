ALTER TABLE "User" ADD COLUMN "resumeText" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "resumeIncluded" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "systemMessage" text;