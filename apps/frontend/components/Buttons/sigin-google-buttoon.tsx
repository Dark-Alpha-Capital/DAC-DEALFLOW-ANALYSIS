"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { FaGoogle } from "react-icons/fa6";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";

const SigninGoogle = () => {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={() => {
        signIn("google", { callbackUrl: DEFAULT_LOGIN_REDIRECT });
      }}
      className="w-full h-11 text-base font-medium hover:bg-accent transition-colors"
    >
      <FaGoogle className="mr-2 size-5" /> 
      Sign in with Google
    </Button>
  );
};

export default SigninGoogle;
