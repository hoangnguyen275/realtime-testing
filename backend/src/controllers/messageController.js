import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";

const uploadMessageImageFile = async (file) => {
  if (!file) return undefined;

  const result = await uploadImageFromBuffer(file.buffer, {
    folder: "terces_chat/messages",
    transformation: [{ width: 1600, crop: "limit" }],
  });

  return result.secure_url;
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
    const senderId = req.user._id;

    let conversation;

    if (!content?.trim() && !req.file) {
      return res.status(400).json({ message: "Content or an image is required" });
    }

    const imgUrl = await uploadMessageImageFile(req.file);

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
      imgUrl,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();

    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Error while sending direct messages", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;

    if (!content?.trim() && !req.file) {
      return res.status(400).json({ message: "Content or an image is required" });
    }

    const imgUrl = await uploadMessageImageFile(req.file);

    const message = await Message.create({
      conversationId,
      senderId,
      content,
      imgUrl,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Error while sending group messages", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
