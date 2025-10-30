"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "./ui/button";

const PreviousPageButton = () => {
  const router = useRouter();

  return (
    <Button
      variant={"outline"}
      onClick={() => {
        router.back();
      }}
    >
      <ArrowLeft className="h-4 w-4" /> Previous Page
      <span className="sr-only">Previous Page</span>
    </Button>
  );
};

export default PreviousPageButton;
