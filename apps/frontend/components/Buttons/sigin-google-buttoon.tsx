
import React from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { FaGoogle } from "react-icons/fa6";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { toast } from "sonner";

const SigninGoogle = () => {
  return (
    <Button
      onClick={async () => {
        console.log("clicked google sign in");

        try {
          const response = await authClient.signIn.social({
            provider: "google",
            callbackURL: DEFAULT_LOGIN_REDIRECT,
          });
          console.log(response);
        } catch (error) {
          console.log(error);
          toast.error("Failed to sign in with Google");
        }
      }}
    >
      <FaGoogle className="mr-2 size-5" />
      Sign in with Google
    </Button>
  );
};

export default SigninGoogle;
