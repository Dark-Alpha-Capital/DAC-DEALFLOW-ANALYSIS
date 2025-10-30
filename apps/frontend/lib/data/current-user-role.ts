import { auth } from "@/auth";
import React from "react";

const getCurrentUserRole = async () => {
  const userSession = await auth();
  return userSession?.user.role;
};

export default getCurrentUserRole;
