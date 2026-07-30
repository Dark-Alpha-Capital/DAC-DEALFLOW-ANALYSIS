import type { QueryClient } from "@tanstack/react-query";

export const RECENT_CHATS_INPUT = { limit: 50 } as const;

export const RECENT_CHATS_CACHE_OPTIONS = {
  staleTime: 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

type ChatsListRecentKeyFactory = {
  chats: {
    listRecent: {
      queryKey: (input: typeof RECENT_CHATS_INPUT) => readonly unknown[];
    };
  };
};

export function getRecentChatsQueryKey(
  trpc: ChatsListRecentKeyFactory,
): readonly unknown[] {
  return trpc.chats.listRecent.queryKey(RECENT_CHATS_INPUT);
}

export function invalidateRecentChatsQuery(
  queryClient: QueryClient,
  trpc: ChatsListRecentKeyFactory,
) {
  return queryClient.invalidateQueries({
    queryKey: getRecentChatsQueryKey(trpc),
  });
}
