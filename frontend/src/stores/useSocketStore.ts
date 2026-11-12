import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import { useFriendStore } from "./useFriendStore";

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  connectSocket: () => {
    const accessToken = useAuthStore.getState().accessToken;
    const existingSocket = get().socket;

    if (existingSocket) return; // avoid creating multiple sockets

    const socket: Socket = io(baseURL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    set({ socket });

    socket.on("connect", () => {
      console.log("Socket connected");
      // events sent while the socket was down (e.g. server waking up) are not replayed, so catch up
      useFriendStore.getState().getAllFriendRequests();
    });

    // online users
    socket.on("online-users", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // new message
    socket.on("new-message", async ({ message, conversation, unreadCounts }) => {
      // a conversation the user deleted comes back when someone writes to it
      const known = useChatStore
        .getState()
        .conversations.some((c) => c._id === message.conversationId);
      if (!known) await useChatStore.getState().fetchConversations();

      useChatStore.getState().addMessage(message);

      const lastMessage = {
        _id: conversation.lastMessage._id,
        content: conversation.lastMessage.content,
        createdAt: conversation.lastMessage.createdAt,
        sender: {
          _id: conversation.lastMessage.senderId,
          displayName: "",
          avatarUrl: null,
        },
      };

      const updatedConversation = {
        ...conversation,
        lastMessage,
        unreadCounts,
      };

      if (useChatStore.getState().activeConversationId === message.conversationId) {
        useChatStore.getState().markAsSeen();
      }

      useChatStore.getState().updateConversation(updatedConversation);
    });

    // read message
    socket.on("read-message", ({ conversation, lastMessage }) => {
      const updated = {
        _id: conversation._id,
        lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCounts: conversation.unreadCounts,
        seenBy: conversation.seenBy,
      };

      useChatStore.getState().updateConversation(updated);
    });

    // someone sent me a friend request
    socket.on("friend-request-received", () => {
      useFriendStore.getState().getAllFriendRequests();
    });

    // a friend request was accepted (by me or by the other person)
    socket.on("friend-added", ({ friendId }) => {
      useFriendStore.getState().addNewFriend(friendId);
      useFriendStore.getState().getFriends();
    });

    // unfriended (by me or by the other person)
    socket.on("friend-removed", ({ friendId, conversationId }) => {
      useFriendStore.getState().removeFriendLocally(friendId);
      if (conversationId) useChatStore.getState().removeConversation(conversationId);
    });

    // deleted or left a conversation (keeps my other tabs in sync)
    socket.on("conversation-removed", ({ conversationId }) => {
      useChatStore.getState().removeConversation(conversationId);
    });

    // someone left a group I am in
    socket.on("member-left", ({ conversationId, userId }) => {
      useChatStore.getState().removeMember(conversationId, userId);
    });

    // new group chat
    socket.on("new-group", (conversation) => {
      useChatStore.getState().addConvo(conversation);
      socket.emit("join-conversation", conversation._id);
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
