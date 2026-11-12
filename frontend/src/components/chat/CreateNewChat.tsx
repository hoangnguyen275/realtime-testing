import { useFriendStore } from "@/stores/useFriendStore";
import { Card } from "../ui/card";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { MessageCircle } from "lucide-react";
import FriendListModal from "../createNewChat/FriendListModal";

const CreateNewChat = () => {
  const { getFriends, newFriendIds, clearNewFriends } = useFriendStore();
  const hasNewFriend = newFriendIds.length > 0;

  const handleGetFriends = async () => {
    await getFriends();
  };

  return (
    <div className="flex gap-2">
      <Card
        className="relative flex-1 p-3 glass hover:shadow-soft transition-smooth cursor-pointer group/card"
        onClick={handleGetFriends}
      >
        <Dialog onOpenChange={(open) => open && clearNewFriends()}>
          <DialogTrigger>
            <div className="flex items-center gap-4">
              <div className="size-8 bg-gradient-chat rounded-full flex items-center justify-center group-hover/card:scale-110 transition-bounce">
                <MessageCircle className="size-4 text-white" />
              </div>
              <span className="text-sm font-medium capitalize">
                friend lists
              </span>
            </div>
          </DialogTrigger>

          <FriendListModal />
        </Dialog>

        {/* a friend was just added: dot until the list is opened */}
        {hasNewFriend && (
          <span className="pointer-events-none absolute -top-1 -right-1 size-3 rounded-full bg-red-500 ring-2 ring-background">
            <span className="sr-only">You have new friends</span>
          </span>
        )}
      </Card>
    </div>
  );
};

export default CreateNewChat;
