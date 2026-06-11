CREATE TABLE "BitrixWidgetDealFile" (
	"id" text PRIMARY KEY NOT NULL,
	"bitrixDealId" text NOT NULL,
	"bitrixFieldId" text NOT NULL,
	"bitrixDiskFileId" text NOT NULL,
	"displayName" text,
	"documentId" text,
	"contentHash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BitrixWidgetDealFile" ADD CONSTRAINT "BitrixWidgetDealFile_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bitrix_widget_deal_file_uniq" ON "BitrixWidgetDealFile" USING btree ("bitrixDealId","bitrixDiskFileId");--> statement-breakpoint
CREATE INDEX "bitrix_widget_deal_file_deal_idx" ON "BitrixWidgetDealFile" USING btree ("bitrixDealId");