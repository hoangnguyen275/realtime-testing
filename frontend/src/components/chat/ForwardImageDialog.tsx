import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
import { Input } from "../ui/input";
import GroupChatAvatar from "./GroupChatAvatar";
import UserAvatar from "./UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";

interface ForwardImageDialogProps {
  imgUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Lets the user send an already-uploaded image to one or more of their conversations.
const ForwardImageDialog = ({
  imgUrl,
  open,
  onOpenChange,
}: ForwardImageDialogProps) => {
  const { user } = useAuthStore();
  const { conversations, forwardImage } = useChatStore();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // start fresh every time the dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected([]);
    }
  }, [open]);

  if (!user) return null;

  const items = conversations
    .map((convo) => {
      const other =
        convo.type === "direct"
          ? convo.participants.find((p) => p._id !== user._id)
          : undefined;
      return {
        convo,
        other,
        name: other?.displayName ?? convo.group?.name ?? "",
      };
    })
    .filter((item) =>
      item.name.toLowerCase().includes(query.trim().toLowerCase()),
    );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSend = async () => {
    if (selected.length === 0 || sending) return;
    setSending(true);

    const results = await Promise.allSettled(
      selected.map((id) => forwardImage(id, imgUrl)),
    );
    const failedIds = selected.filter(
      (_, i) => results[i].status === "rejected",
    );
    const sentCount = selected.length - failedIds.length;

    setSending(false);

    if (failedIds.length === 0) {
      toast.success(
        `Image sent to ${sentCount} chat${sentCount > 1 ? "s" : ""}`,
      );
      onOpenChange(false);
      return;
    }

    // keep the chats that failed selected so the user can retry
    setSelected(failedIds);
    toast.error(
      `Could not send to ${failedIds.length} chat${failedIds.length > 1 ? "s" : ""}.`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share image</DialogTitle>
          <DialogDescription>
            Choose the chats to send this image to.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-8"
          />
        </div>

        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {items.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No chats found
            </li>
          )}

          {items.map(({ convo, other, name }) => (
            <li key={convo._id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={selected.includes(convo._id)}
                  onChange={() => toggle(convo._id)}
                />
                {convo.type === "direct" ? (
                  <UserAvatar
                    type="chat"
                    name={name}
                    avatarUrl={other?.avatarUrl ?? undefined}
                  />
                ) : (
                  <GroupChatAvatar
                    participants={convo.participants}
                    type="chat"
                  />
                )}
                <span className="truncate text-sm font-medium">{name}</span>
              </label>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={sending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0 || sending}
            onClick={handleSend}
          >
            {sending
              ? "Sending..."
              : selected.length > 0
                ? `Send (${selected.length})`
                : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardImageDialog;
