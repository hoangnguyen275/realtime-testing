import api from "@/lib/axios";
import type { ConversationResponse, Message } from "@/types/chat";

interface FetchMessageProps {
  messages: Message[];
  cursor?: string;
}

const pageLimit = 50;

// With an image, send multipart/form-data (the browser sets the boundary); otherwise plain JSON.
const buildMessagePayload = (fields: Record<string, string | undefined>, file?: File) => {
  if (!file) return fields;

  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, value);
  });
  formData.append("file", file);
  return formData;
};

export const chatService = {
  async fetchConversations(): Promise<ConversationResponse> {
    const res = await api.get("/conversations");
    return res.data;
  },

  async fetchMessages(id: string, cursor?: string): Promise<FetchMessageProps> {
    const res = await api.get(
      `/conversations/${id}/messages?limit=${pageLimit}&cursor=${cursor}`
    );

    return { messages: res.data.messages, cursor: res.data.nextCursor };
  },

  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    file?: File,
    conversationId?: string,
    imgUrl?: string // an already-uploaded image (used when forwarding)
  ) {
    const res = await api.post(
      "/messages/direct",
      buildMessagePayload({ recipientId, content, conversationId, imgUrl }, file)
    );

    return res.data.message;
  },

  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    file?: File,
    imgUrl?: string // an already-uploaded image (used when forwarding)
  ) {
    const res = await api.post(
      "/messages/group",
      buildMessagePayload({ conversationId, content, imgUrl }, file)
    );
    return res.data.message;
  },

  async markAsSeen(conversationId: string) {
    const res = await api.patch(`/conversations/${conversationId}/seen`);
    return res.data;
  },

  async deleteConversation(conversationId: string) {
    await api.delete(`/conversations/${conversationId}`);
  },

  async muteConversation(conversationId: string, muted: boolean): Promise<string[]> {
    const res = await api.patch(`/conversations/${conversationId}/mute`, { muted });
    return res.data.mutedBy;
  },

  async leaveGroup(conversationId: string) {
    await api.post(`/conversations/${conversationId}/leave`);
  },

  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ) {
    const res = await api.post("/conversations", { type, name, memberIds });
    return res.data.conversation;
  },
};
