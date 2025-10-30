"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddScreeningBaseline from "@/app/actions/add-baseline";
import { Textarea } from "../ui/textarea";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 7MB in bytes

const ACCEPTED_TEXT_TYPES = [
  "application/pdf", // .pdf
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain", // .txt
];

export const BaselineUploadFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  author: z.string().min(1, "Author is required."),
  purpose: z.optional(z.string()),
  version: z.optional(z.string()),
  questionnaire: z
    .instanceof(File)
    .refine((file) => ACCEPTED_TEXT_TYPES.includes(file.type), {
      message: "Only .pdf, .docx, and .txt files are allowed.",
    })
    .refine((file) => file.size < MAX_FILE_SIZE, {
      message: "File size must be less than 2MB.",
    }),
  // .refine((file) => {
  //   const allowedExtensions = [".pdf", ".docx", ".doc", ".txt"];
  //   const fileExtension = file.name
  //     .slice(file.name.lastIndexOf("."))
  //     .toLowerCase();
  //   return allowedExtensions.includes(fileExtension);
  // }),
});

export type BaselineUploadZodType = z.infer<typeof BaselineUploadFormSchema>;

const BaseLineUploadForm = () => {
  const { toast } = useToast();

  const [isPending, startTransition] = React.useTransition();

  const form = useForm<BaselineUploadZodType>({
    resolver: zodResolver(BaselineUploadFormSchema),
    defaultValues: {
      title: "", // Ensure title has a default value
      author: "", // Default value for author
      version: "", // Default value for optional fields
      purpose: "", // Default value for optional fields
    },
  });

  function onSubmit(values: BaselineUploadZodType) {
    console.log("file value is ", values);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("questionnaire", values.questionnaire);
      formData.append("title", values.title);
      if (values.version) {
        formData.append("version", values.version);
      }

      if (values.purpose) {
        formData.append("purpose", values.purpose);
      }

      formData.append("author", values.author);

      const response = await AddScreeningBaseline(formData);
      if (response.type === "success") {
        toast({
          title: "Baseline added successfully",
          variant: "success",
        });
      }

      if (response.type === "error") {
        {
          toast({
            title: "Failed to add baseline. Please try again.",
            variant: "destructive",
          });
        }
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Questionaire Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="deal screen.txt"
                  className="w-full"
                  {...field}
                />
              </FormControl>
              <FormDescription>Enter your questionaire title</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input
                  placeholder="destiny aigbe"
                  className="w-full"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the author for this questionaire
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Version</FormLabel>
              <FormControl>
                <Input
                  placeholder="destiny aigbe"
                  className="w-full"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the version of questionaire
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime distinctio nesciunt laudantium, quae magni itaque odit libero soluta at fuga obcaecati repudiandae molestiae consequuntur voluptatum unde delectus accusantium animi. Quidem?"
                  rows={5}
                  className="w-full"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the version of questionaire
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="questionnaire"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Deal Screening Questionnaire</FormLabel>
              <FormControl>
                <Input
                  {...fieldProps}
                  placeholder="Picture"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(event) =>
                    onChange(event.target.files && event.target.files[0])
                  }
                />
              </FormControl>
              <FormDescription>upload questionnaire.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </Form>
  );
};

export default BaseLineUploadForm;
