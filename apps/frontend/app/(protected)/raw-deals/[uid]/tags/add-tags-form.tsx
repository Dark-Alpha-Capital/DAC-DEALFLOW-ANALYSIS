"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TagsInput } from "@/components/ui/tags-input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export default function AddTagsForm({
  dealUid,
  existingTags,
}: {
  dealUid: string;
  existingTags: string[];
}) {
  const [tags, setTags] = useState<string[]>(existingTags);
  const trpc = useTRPC();

  const { mutate: updateTags, isPending } = useMutation(
    trpc.deals.updateTags.mutationOptions({
      onSuccess: () => {
        toast.success("Tags updated successfully");
        setTags([]);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update tags");
      },
    })
  );

  const handleSaveTags = () => {
    updateTags({ dealId: dealUid, tags });
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
