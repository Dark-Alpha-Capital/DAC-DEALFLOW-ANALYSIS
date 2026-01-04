import { authClient } from "@/lib/auth-client";

const useCurrentUser = () => {
  const { data: session } = authClient.useSession();
  return session?.user;
};

export default useCurrentUser;
