"use client";

import React, { useOptimistic, useTransition } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter, useSearchParams } from "next/navigation";
import { Value } from "@radix-ui/react-select";
import { UserRoundIcon } from "lucide-react";
import useCurrentUser from "@/hooks/use-current-user";

const UserDealFilter = () => {
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userIdSelected, setUserIdSelected] = useOptimistic(
    searchParams.getAll("userId"),
  );

  return (
    <div
      className="flex items-center gap-2"
      data-pending={isPending ? "" : undefined}
    >
      <ToggleGroup
        type="multiple"
        onValueChange={(value) => {
          startTransition(() => {
            console.log("value", value);
            const params = new URLSearchParams(searchParams);
            params.delete("userId");
            const currentUserId = user?.id || "";
            // The `value` from ToggleGroup type="multiple" is string[]
            if (value.includes(currentUserId)) {
              // If the current user's ID is now selected, set the param
              params.set("userId", currentUserId);
            } else {
              // If the current user's ID was deselected, remove the param
              params.delete("userId");
            }
            // Update optimistic state with the array of selected values
            setUserIdSelected(value);
            router.push(`?${params.toString()}`, {
              scroll: false,
            });
          });
        }}
        defaultValue={userIdSelected}
      >
        <ToggleGroupItem value={user?.id || ""}>
          <UserRoundIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default UserDealFilter;
