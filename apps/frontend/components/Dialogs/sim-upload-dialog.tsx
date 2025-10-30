"use client";

import React, { useTransition } from "react";
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
import { Label } from "@/components/ui/label";
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
import { cimFormSchema, CimFormValues } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import UploadCim from "@/app/actions/upload-cim";
import { DealType } from "@prisma/client";

interface SimUploadDialogProps {
  dealId: string;
  dealType: DealType;
}

const SimUploadDialog: React.FC<SimUploadDialogProps> = ({
  dealId,
  dealType,
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<CimFormValues>({
    resolver: zodResolver(cimFormSchema),
    defaultValues: {
      title: "",
      caption: "",
      status: "IN_PROGRESS",
    },
  });

  const onSubmit = (data: CimFormValues) => {
    startTransition(async () => {
      console.log("data", data);

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("caption", data.caption);
      formData.append("status", data.status);
      formData.append("file", data.file);

      console.log("formData", formData);

      try {
        const result = await UploadCim(formData, dealId, dealType);

        if (result.success) {
          toast({
            title: "CIM uploaded successfully",
            description:
              "The Confidential Information Memorandum has been added to the deal.",
          });
          form.reset();
          setIsOpen(false);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error uploading CIM:", error);
        toast({
          title: "Error uploading CIM",
          description:
            "There was a problem uploading the Confidential Information Memorandum. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload CIM
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload CIM</DialogTitle>
          <DialogDescription>
            Upload a Confidential Information Memorandum (CIM) for this deal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIM File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt"
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
              name="caption"
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              <FileIcon className="mr-2 h-4 w-4" />
              {isPending ? "Uploading..." : "Upload CIM"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SimUploadDialog;
