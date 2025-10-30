import Image from "next/image";
import React, { Suspense } from "react";

import { redirect } from "next/navigation";
import { Metadata } from "next";
import SigninGoogle from "@/components/Buttons/sigin-google-buttoon";

export const metadata: Metadata = {
  title: "Log In to Dark Alpha Capital Deal Sourcing Organization",
  description: "Login to Dark Alpha Capital",
};

const LoginPage = async () => {
  //   const session = await auth();

  //   if (session) {
  //     return redirect("/");
  //   }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-md space-y-6 px-8 py-12">
        <h2 className="text-center">
          Welcome to Dark Alpha Deal Sourcing Organization
        </h2>
        <p className="text-center text-sm text-gray-600">
          Please sign in to access deal screening using AI.
        </p>

        <div className="justify-center">
          <SigninGoogle />
        </div>

        <p className="text-center text-xs text-gray-500">
          Only authorized members of the organization can access this platform.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
