"use client";

import { DealDocumentCategory, DealType } from "@prisma/client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileIcon, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DealDocumentItem = ({
  title,
  description,
  category,
  documentId,
  dealId,
  dealType,
  fileUrl,
}: {
  title: string;
  description: string;
  category: DealDocumentCategory;
  documentId: string;
  dealId: string;
  dealType: DealType;
  fileUrl: string;
}) => {
  return (
    <Card className="mb-4 transition-all hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <Badge variant="secondary" className="mt-2">
              {category.toLowerCase()}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 border-t bg-muted/50 px-6 py-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(fileUrl, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View Document
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            const link = document.createElement("a");
            link.href = fileUrl;
            link.download = title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DealDocumentItem;
