import { friendService } from "@/services/friendService";
import type { FriendState } from "@/types/store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useChatStore } from "./useChatStore";

export const useFriendStore = create<FriendState>()(
  persist(
    (set) => ({
      friends: [],
      loading: false,
      receivedList: [],
      sentList: [],
      seenRequestIds: [],
      newFriendIds: [],
      searchByUsername: async (username) => {
        try {
          set({ loading: true });

          const user = await friendService.searchByUsername(username);

          return user;
        } catch (error) {
          console.error("Error while finding the user by username", error);
          return null;
        } finally {
          set({ loading: false });
        }
      },
      addFriend: async (to, message) => {
        try {
          set({ loading: true });
          const resultMessage = await friendService.sendFriendRequest(
            to,
            message,
          );
          return resultMessage;
        } catch (error) {
          console.error("Error while addFriend", error);
          return "Error while sending friend request. Please try again";
        } finally {
          set({ loading: false });
        }
      },
      getAllFriendRequests: async () => {
        try {
          set({ loading: true });

          const result = await friendService.getAllFriendRequest();

          if (!result) return;

          const { received, sent } = result;

          set({ receivedList: received, sentList: sent });
        } catch (error) {
          console.error("Error while getAllFriendRequests", error);
        } finally {
          set({ loading: false });
        }
      },
      acceptRequest: async (requestId) => {
        try {
          set({ loading: true });
          const newFriend = await friendService.acceptRequest(requestId);
          if (newFriend?._id)
            useFriendStore.getState().addNewFriend(newFriend._id);

          set((state) => ({
            receivedList: state.receivedList.filter((r) => r._id !== requestId),
          }));
        } catch (error) {
          console.error("Error while acceptRequest", error);
        } finally {
          set({ loading: false });
        }
      },
      declineRequest: async (requestId) => {
        try {
          set({ loading: true });
          await friendService.declineRequest(requestId);

          set((state) => ({
            receivedList: state.receivedList.filter((r) => r._id !== requestId),
          }));
        } catch (error) {
          console.error("Error while declineRequest", error);
        } finally {
          set({ loading: false });
        }
      },
      markRequestsSeen: () => {
        set((state) => ({
          // keep only ids that still exist so the list cannot grow forever
          seenRequestIds: state.receivedList.map((r) => r._id),
        }));
      },
      addNewFriend: (friendId) => {
        set((state) =>
          state.newFriendIds.includes(friendId)
            ? state
            : { newFriendIds: [...state.newFriendIds, friendId] },
        );
      },
      clearNewFriends: () => {
        set((state) =>
          state.newFriendIds.length ? { newFriendIds: [] } : state,
        );
      },
      removeFriendLocally: (friendId) => {
        set((state) => ({
          friends: state.friends.filter((f) => f._id !== friendId),
          newFriendIds: state.newFriendIds.filter((id) => id !== friendId),
        }));
      },
      unfriend: async (friendId) => {
        const { conversationId } = await friendService.removeFriend(friendId);

        useFriendStore.getState().removeFriendLocally(friendId);
        if (conversationId)
          useChatStore.getState().removeConversation(conversationId);
      },
      getFriends: async () => {
        try {
          set({ loading: true });
          const friends = await friendService.getFriendList();
          set({ friends: friends });
        } catch (error) {
          console.error("Error while load friends", error);
          set({ friends: [] });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "friend-storage",
      partialize: (state) => ({
        seenRequestIds: state.seenRequestIds,
        newFriendIds: state.newFriendIds,
      }),
    },
  ),
);
