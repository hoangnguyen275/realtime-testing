import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { ImagePlus, Send, X } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB, matches the backend limit

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { user } = useAuthStore();
  const { sendDirectMessage, sendGroupMessage } = useChatStore();
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // object URL for the preview; revoke it when the file changes or the component unmounts
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // drop a pending image when switching conversations
  useEffect(() => {
    setFile(null);
  }, [selectedConvo._id]);

  if (!user) return;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!picked) return;

    if (!picked.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (picked.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setFile(picked);
  };

  const canSend = (!!value.trim() || !!file) && !sending;

  const sendMessage = async () => {
    if (!canSend) return;
    const currValue = value;
    const currFile = file ?? undefined;
    setValue("");
    setSending(true);

    try {
      if (selectedConvo.type === "direct") {
        const participants = selectedConvo.participants;
        const otherUser = participants.filter((p) => p._id !== user._id)[0];
        await sendDirectMessage(otherUser._id, currValue, currFile);
      } else {
        await sendGroupMessage(selectedConvo._id, currValue, currFile);
      }
      setFile(null);
    } catch (error) {
      console.error(error);
      setValue(currValue); // keep the caption so the user can retry
      toast.error("Error sending message. Please try again!");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-background">
      {preview && (
        <div className="px-3 pt-3">
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Selected upload"
              className="h-24 w-auto max-w-[200px] rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={sending}
              aria-label="Remove image"
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 min-h-[56px]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach image"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="hover:bg-primary/10 transition-smooth"
        >
          <ImagePlus className="size-4" />
        </Button>

        <div className="flex-1 relative">
          <Input
            onKeyPress={handleKeyPress}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={file ? "Add a caption..." : "Compose a message..."}
            className="pr-20 h-9 bg-white border-border/50 focus:border-primary/50 transition-smooth resize-none"
          ></Input>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
            >
              <div>
                <EmojiPicker
                  onChange={(emoji: string) => setValue(`${value}${emoji}`)}
                />
              </div>
            </Button>
          </div>
        </div>

        <Button
          onClick={sendMessage}
          className="bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105"
          disabled={!canSend}
        >
          <Send className="size-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
