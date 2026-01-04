"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Lock } from "lucide-react";

const ErrorCard = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error === "AccessDenied") {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <Lock className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription className="mt-2">
          Your email account is not authorized to access this platform. 
          Please contact your administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Authentication Failed</AlertTitle>
        <AlertDescription className="mt-2">
          {error.charAt(0).toUpperCase() + error.slice(1).replace(/([A-Z])/g, " $1")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-muted">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Unknown Error</AlertTitle>
      <AlertDescription className="mt-2">
        An unexpected error occurred. Please try again.
      </AlertDescription>
    </Alert>
  );
};

export default ErrorCard;
