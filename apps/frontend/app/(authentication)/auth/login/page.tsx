import React from "react";
import { Metadata } from "next";
import SigninGoogle from "@/components/Buttons/sigin-google-buttoon";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Log In to Dark Alpha Capital Deal Sourcing Organization",
  description: "Login to Dark Alpha Capital",
};

const LoginPage = async () => {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-2">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-2">
            <div className="text-2xl font-bold tracking-tight text-primary">
              DAC DEALFLOW
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to access your deal sourcing platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <SigninGoogle />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-xs text-muted-foreground">
            Only authorized members can access this platform
          </p>
          <div className="text-center text-xs text-muted-foreground/70">
            Powered by{" "}
            <span className="font-semibold text-primary">Dark Alpha Capital</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
