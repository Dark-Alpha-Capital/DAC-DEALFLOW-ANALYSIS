import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_protected/settings/members")({
  head: () => ({
    meta: [{ title: "Members — Dark Alpha Capital" }],
  }),
  component: MembersSettingsRoute,
});

type InviteRole = "ADMIN" | "MEMBER";

function MembersSettingsRoute() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("MEMBER");

  const membersQuery = useQuery(trpc.organizations.listMembers.queryOptions());
  const canManage = membersQuery.data?.canManage ?? false;
  const currentUserId = membersQuery.data?.currentUserId;
  const members = membersQuery.data?.members ?? [];

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.organizations.listMembers.queryKey(),
    });
    await queryClient.invalidateQueries({
      queryKey: trpc.organizations.getActiveOrganization.queryKey(),
    });
  };

  const inviteMutation = useMutation(
    trpc.organizations.inviteMember.mutationOptions({
      onSuccess: async () => {
        setEmail("");
        setRole("MEMBER");
        await invalidate();
        toast.success("Member added");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateRoleMutation = useMutation(
    trpc.organizations.updateMemberRole.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Role updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const removeMutation = useMutation(
    trpc.organizations.removeMember.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Member removed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          People in your organization. Invitees must already have an account.
        </p>
      </div>

      {canManage ? (
        <form
          className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            inviteMutation.mutate({ email, role });
          }}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="text-sm font-medium" htmlFor="invite-email">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@darkalphacapital.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as InviteRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? "Adding…" : "Add member"}
          </Button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border">
        {membersQuery.isLoading ? (
          <p className="text-muted-foreground p-6 text-sm">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">No members yet.</p>
        ) : (
          <ul className="divide-y">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const canEdit =
                canManage && !isSelf && member.role !== "OWNER";
              return (
                <li
                  key={member.membershipId}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback>
                        {(member.name || member.email || "?").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {member.name || "Unnamed"}
                        {isSelf ? (
                          <span className="text-muted-foreground ml-2 text-xs">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({
                            userId: member.userId,
                            role: value as InviteRole,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{member.role}</Badge>
                    )}

                    {canEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={removeMutation.isPending}
                        onClick={() =>
                          removeMutation.mutate({ userId: member.userId })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
