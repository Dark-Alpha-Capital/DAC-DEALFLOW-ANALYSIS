import { useSession } from "@/lib/auth-client";

const useCurrentUserRole = () => {
  const { data: session } = useSession();
  return (session?.user as any)?.role;
};

export default useCurrentUserRole;
