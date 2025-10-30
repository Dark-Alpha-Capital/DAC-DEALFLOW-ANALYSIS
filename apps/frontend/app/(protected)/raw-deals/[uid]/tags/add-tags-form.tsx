"use client";

import { saveDealTags } from "@/app/actions/add-deal-tags";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TagsInput } from "@/components/ui/tags-input";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddTagsForm({
  dealUid,
  existingTags,
}: {
  dealUid: string;
  existingTags: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [tags, setTags] = useState<string[]>(existingTags);

  const handleSaveTags = () => {
    startTransition(async () => {
      console.log("sending tags", tags);

      const result = await saveDealTags(tags, dealUid);
      console.log("result", result);

      if (result.success) {
        toast.success(result.message);
        setTags([]);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleTagsChange = (tags: string[]) => {
    console.log("Tags updated:", tags);
    setTags(tags);
  };

  return (
    <div className="">
      <div className="">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Enter tags to this deal</h1>
          <p className="mt-2 text-muted-foreground">
            Add up to 5 tags by typing and pressing Enter
          </p>
        </div>

        <Card className="mt-4 md:mt-6 lg:mt-12">
          <CardHeader>
            <CardTitle>Add Tags</CardTitle>
            <CardDescription>
              Type a tag and press Enter to add it. Click the X to remove tags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagsInput
              placeholder="Enter a tag (e.g., AI, M&A, etc.)"
              maxTags={5}
              value={tags}
              onTagsChange={handleTagsChange}
            />
            <Button
              disabled={isPending}
              className="mt-4 md:mt-6 lg:mt-8"
              onClick={handleSaveTags}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Tags"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
