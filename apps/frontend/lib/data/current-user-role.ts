import { auth } from "@/auth";
import { headers } from "next/headers";

const getCurrentUserRole = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (session?.user as any)?.role;
};

export default getCurrentUserRole;
