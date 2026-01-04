import React, { Suspense } from "react";
import ErrorCard from "./ErrorCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const AuthErrorPage = async () => {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-2 border-destructive/20">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-base">
            An error occurred during authentication. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">Loading error details...</div>
              </div>
            }
          >
            <ErrorCard />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Try Again</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Only authorized members can access this platform
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthErrorPage;
