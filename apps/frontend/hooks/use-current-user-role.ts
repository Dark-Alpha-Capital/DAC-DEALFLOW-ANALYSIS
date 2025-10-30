import { auth } from "@/auth";
import { useSession } from "next-auth/react";

const useCurrentUserRole = () => {
  const session = useSession();
  return session.data?.user.role;
};

export default useCurrentUserRole;
