"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";

const ErrorCard = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error === "AccessDenied") {
    return (
      <div>
        <span className="error font-semibold text-red-600">
          Your email account is not authorized to access this content
        </span>
      </div>
    );
  }

  return (
    <div>
      <span className="error font-semibold text-red-600">
        {error ? error : null}
      </span>
    </div>
  );
};

export default ErrorCard;
