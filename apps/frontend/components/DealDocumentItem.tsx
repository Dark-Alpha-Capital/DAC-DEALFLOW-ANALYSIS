import { Button } from "@/components/ui/button";
import { ExternalLink, FileIcon, Download } from "lucide-react";
import { DocumentCategory } from "@repo/db/enums";

const DealDocumentItem = ({
  title,
  description,
  caption,
  category,
  fileUrl,
  tags,
  fileName,
  fileType,
}: {
  title: string;
  description: string;
  caption?: string | null;
  category: DocumentCategory;
  fileUrl: string;
  tags?: string[];
  fileName?: string | null;
  fileType?: string | null;
}) => {
  return (
    <div className="border-border mb-4 border-b pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          </div>
          {caption && (
            <p className="text-muted-foreground text-xs italic">{caption}</p>
          )}
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-muted-foreground text-xs">
              {category.toLowerCase()}
            </span>
            {tags && tags.length > 0 && (
              <>
                <span className="text-border">·</span>
                {tags.map((tag, index) => (
                  <span key={index} className="text-muted-foreground text-xs">
                    {tag}
                  </span>
                ))}
              </>
            )}
          </div>
          {(fileName || fileType) && (
            <p className="text-muted-foreground text-xs">
              {fileName}
              {fileName && fileType && " · "}
              {fileType}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => window.open(fileUrl, "_blank")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => {
            const link = document.createElement("a");
            link.href = fileUrl;
            link.download = title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
};

export default DealDocumentItem;
