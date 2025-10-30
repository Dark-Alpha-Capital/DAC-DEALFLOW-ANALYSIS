"use client";

import React, { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Deal } from "@prisma/client";
import { toast } from "sonner";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import ReactMarkdown from "react-markdown";
import { Trash2, Save, PlayCircle } from "lucide-react";
import screenDeal from "@/app/actions/screen-deal";
import { screeningSaveResult } from "@/app/actions/screening-save-result";
import { Skeleton } from "./ui/skeleton";
import axios from "axios";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { EvalOptions } from "@/app/types";

const ScreenDealComponent = ({ deal }: { deal: Deal }) => {
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [screeningResult, setScreeningResult] = useState<string>("");
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [evalOptions, setEvalOptions] = useState<EvalOptions>({
    userPrompt: "",
    sections: ["score", "risks"],
    tone: "bullet",
    detailLevel: "deep",
    scale: "0-100",
    language: "en",
    format: "markdown",
    framework: "swot",
    temperature: 0.7,
  });

  const handleScreenDeal = async () => {
    setScreeningResult(""); // Clear previous results
    startTransition(async () => {
      try {
        const response = await axios.post("/api/screen", {
          deal,
          ...evalOptions,
        });

        const result = await response.data;
        if (response.status === 200) {
          toast.success("Deal screened successfully");
          //@ts-ignore
          setScreeningResult(result.text!);
        } else {
          toast.error("Failed to screen deal");
        }
      } catch (error) {
        toast.error("Failed to screen deal");
        console.error(error);
      }
    });
  };

  const handleSaveResult = async () => {
    startSavingTransition(async () => {
      if (!screeningResult) {
        toast.error("No screening result to save");
        return;
      }

      const response = await screeningSaveResult(screeningResult, deal.id);
      if (response.type === "error") {
        toast.error(response.message);
      } else {
        toast.success("Screening result saved");
      }
    });
  };

  const handleDeleteResult = () => {
    setScreeningResult("");
    toast.success("Screening result cleared");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AI Screening Analysis</span>
          <div className="flex gap-2">
            <Button
              onClick={handleScreenDeal}
              disabled={isPending}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              {isPending ? "Analyzing..." : "Start Analysis"}
            </Button>
            {screeningResult && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveResult}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Result"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteResult}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="userPrompt">Additional Instructions</Label>
            <Input
              id="userPrompt"
              value={evalOptions.userPrompt}
              onChange={(e) =>
                setEvalOptions({ ...evalOptions, userPrompt: e.target.value })
              }
              placeholder="Enter any additional instructions..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Analysis Tone</Label>
            <Select
              value={evalOptions.tone}
              onValueChange={(value) =>
                setEvalOptions({
                  ...evalOptions,
                  tone: value as "bullet" | "narrative",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bullet">Bullet Points</SelectItem>
                <SelectItem value="narrative">Narrative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="detailLevel">Detail Level</Label>
            <Select
              value={evalOptions.detailLevel}
              onValueChange={(value) =>
                setEvalOptions({
                  ...evalOptions,
                  detailLevel: value as "short" | "deep",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select detail level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="deep">Deep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scale">Rating Scale</Label>
            <Select
              value={evalOptions.scale}
              onValueChange={(value) =>
                setEvalOptions({
                  ...evalOptions,
                  scale: value as "0-100" | "0-10",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-100">0-100</SelectItem>
                <SelectItem value="0-10">0-10</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="framework">Analysis Framework</Label>
            <Select
              value={evalOptions.framework}
              onValueChange={(value) =>
                setEvalOptions({
                  ...evalOptions,
                  framework: value as "swot" | "porter",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="swot">SWOT</SelectItem>
                <SelectItem value="porter">
                  Porter&apos;s Five Forces
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">AI Temperature</Label>
            <div className="flex items-center gap-2">
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[evalOptions.temperature || 0.7]}
                onValueChange={([value]) =>
                  setEvalOptions({ ...evalOptions, temperature: value })
                }
                className="w-full"
              />
              <span className="text-sm text-muted-foreground">
                {evalOptions.temperature}
              </span>
            </div>
          </div>
        </div>
        <ScrollArea className="h-[600px] pr-4">
          {isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : screeningResult ? (
            <div>
              {annotations.map((annotation) => (
                <div key={annotation}>{annotation}</div>
              ))}
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{screeningResult}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-center text-muted-foreground">
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-semibold">No Analysis Yet</h3>
                <p>
                  Click the button to begin screening this deal using our
                  AI-powered analysis system.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ScreenDealComponent;
