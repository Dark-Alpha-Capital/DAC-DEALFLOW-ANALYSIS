"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Lock } from "lucide-react";

function formatErrorParam(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\.+$/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

const ErrorCard = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error === "AccessDenied") {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <Lock className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription className="mt-2">
          Only Dark Alpha Capital email accounts can access this internal platform.
          Please sign in with your work email or contact your administrator if you
          believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    const isDomainError =
      error.toLowerCase().includes("darkalphacapital") ||
      error.toLowerCase().includes("emails are allowed");
    const displayMessage =
      errorDescription ||
      (isDomainError
        ? "Only Dark Alpha Capital email accounts can access this internal platform. Please sign in with your @darkalphacapital.com work email."
        : formatErrorParam(error));

    return (
      <Alert variant="destructive" className="border-destructive/50">
        <Lock className="h-4 w-4" />
        <AlertTitle>Authentication Failed</AlertTitle>
        <AlertDescription className="mt-2">{displayMessage}</AlertDescription>
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
