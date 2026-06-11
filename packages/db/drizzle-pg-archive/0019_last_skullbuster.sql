CREATE TABLE "ChatSession" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-5-mini' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_session_user_idx" ON "ChatSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chat_session_user_updated_idx" ON "ChatSession" USING btree ("userId","updatedAt");