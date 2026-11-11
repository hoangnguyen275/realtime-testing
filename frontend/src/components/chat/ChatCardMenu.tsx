import { useState } from "react";
import {
  Bell,
  BellOff,
  LogOut,
  MoreHorizontal,
  Trash2,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useFriendStore } from "@/stores/useFriendStore";
import type { Conversation } from "@/types/chat";

type ConfirmAction = "delete" | "unfriend" | "leave";

const ChatCardMenu = ({ convo }: { convo: Conversation }) => {
  const { user } = useAuthStore();
  const { muteConversation, deleteConversation, leaveGroup } = useChatStore();
  const { unfriend } = useFriendStore();

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const isGroup = convo.type === "group";
  const other = convo.participants.find((p) => p._id !== user._id);
  const chatName = isGroup
    ? (convo.group?.name ?? "this group")
    : (other?.displayName ?? "this chat");
  const muted = !!convo.mutedBy?.includes(user._id);

  const handleMute = async () => {
    try {
      await muteConversation(convo._id, !muted);
      toast.success(muted ? "Notifications turned on" : "Notifications muted");
    } catch (error) {
      console.error("Error while muting conversation", error);
      toast.error("Could not update notifications. Please try again!");
    }
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);

    try {
      if (confirm === "delete") {
        await deleteConversation(convo._id);
        toast.success("Conversation deleted");
      } else if (confirm === "leave") {
        await leaveGroup(convo._id);
        toast.success("You left the group");
      } else if (other) {
        await unfriend(other._id);
        toast.success(`You are no longer friends with ${other.displayName}`);
      }
      setConfirm(null);
    } catch (error) {
      console.error("Error while running chat action", error);
      toast.error("Something went wrong. Please try again!");
    } finally {
      setBusy(false);
    }
  };

  const confirmCopy: Record<
    ConfirmAction,
    { title: string; body: string; button: string }
  > = {
    delete: {
      title: "Delete conversation?",
      body: `This clears the chat with ${chatName} from your account. ${
        isGroup ? "Other members keep their copy." : "They keep their copy."
      } It comes back, empty, if someone sends a new message.`,
      button: "Delete",
    },
    leave: {
      title: "Leave group?",
      body: `You will no longer receive messages from ${chatName}. Someone has to add you again if you want to rejoin.`,
      button: "Leave group",
    },
    unfriend: {
      title: "Unfriend?",
      body: `This removes ${chatName} from your friends and permanently deletes your chat history for both of you.`,
      button: "Unfriend",
    },
  };

  return (
    // stop clicks (including ones bubbling out of the portals) from selecting the card
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Chat options"
            className="rounded p-0.5 text-muted-foreground opacity-0 transition-smooth group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-muted"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleMute}>
            {muted ? <Bell /> : <BellOff />}
            {muted ? "Unmute notifications" : "Mute notifications"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isGroup ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirm("leave")}
            >
              <LogOut />
              Leave group
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirm("unfriend")}
            >
              <UserMinus />
              Unfriend
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirm("delete")}
          >
            <Trash2 />
            Delete conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !busy && setConfirm(null)}
      >
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmCopy[confirm].title}</DialogTitle>
                <DialogDescription>
                  {confirmCopy[confirm].body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={runConfirmed}
                >
                  {busy ? "Working..." : confirmCopy[confirm].button}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatCardMenu;
