"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileIcon } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { dealDocumentFormSchema, DealDocumentFormValues } from "@/lib/schemas";
import { DealType, DealDocumentCategory } from "@repo/db/schema";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import useCurrentUser from "@/hooks/use-current-user";

interface DealDocumentUploadDialogProps {
  dealId: string;
  dealType: DealType;
}

const DealDocumentUploadDialog: React.FC<DealDocumentUploadDialogProps> = ({
  dealId,
  dealType,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const trpc = useTRPC();
  const user = useCurrentUser();

  const { mutate: uploadDocument, isPending } = useMutation(
    trpc.deals.uploadDocument.mutationOptions({
      onSuccess: (data) => {
        // Dispatch custom event for real-time job tracking
        if (data.success && data.jobId) {
          const jobData = [
            {
              jobId: data.jobId,
              fileName: data.fileName,
              userId: user?.id || "",
              entityId: dealId,
              entityType: "DEAL" as const,
              queueName: "file-upload" as const,
            },
          ];

          window.dispatchEvent(new CustomEvent("newJobs", { detail: jobData }));
          console.log(`📢 Dispatched new deal file upload job`);
        }

        toast.success("Document uploaded successfully");
        form.reset();
        setIsOpen(false);
      },
      onError: (error) => {
        console.error("Error uploading deal document:", error);
        toast.error(error.message || "Error uploading document");
      },
    }),
  );

  const form = useForm<DealDocumentFormValues>({
    resolver: zodResolver(dealDocumentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "OTHER",
      tags: [],
    },
  });

  const onSubmit = async (data: DealDocumentFormValues) => {
    if (!data.file) {
      toast.error("Please select a file");
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;

      uploadDocument({
        dealId,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        fileData: base64String,
        fileName: data.file.name,
        fileType: data.file.type,
      });
    };

    reader.onerror = () => {
      toast.error("Error reading file");
    };

    reader.readAsDataURL(data.file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this deal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => field.onChange(e.target.files?.[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a PDF, DOCX, or TXT file (max 10MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(DealDocumentCategory).map((category) => (
                        <SelectItem key={category} value={category as string}>
                          {category as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., SIM, CIM, Financial"
                      value={field.value?.join(", ") || ""}
                      onChange={(e) => {
                        const tags = e.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter((tag) => tag.length > 0);
                        field.onChange(tags);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Add tags to categorize this document (e.g., SIM, CIM)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              <FileIcon className="mr-2 h-4 w-4" />
              {isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DealDocumentUploadDialog;
