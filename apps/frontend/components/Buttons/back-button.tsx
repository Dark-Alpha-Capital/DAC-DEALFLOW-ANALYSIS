import React from "react";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/lib/navigation-shim";

const BackButton = ({ label }: { label: string }) => {
  const router = useRouter();

  return (
    <Button variant="outline" onClick={() => router.back()}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default BackButton;
