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

// Forwarding reuses an image that is already stored; only our own chat images are accepted.
const isOwnChatImage = (url) => {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return (
      protocol === "https:" &&
      hostname === "res.cloudinary.com" &&
      pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`) &&
      pathname.includes("/terces_chat/messages/")
    );
  } catch {
    return false;
  }
};

// Returns { imgUrl } (undefined when there is no image) or { error } for a bad forwarded link.
const resolveMessageImage = async (req) => {
  if (req.file) return { imgUrl: await uploadMessageImageFile(req.file) };

  const forwardedUrl = req.body.imgUrl;
  if (!forwardedUrl) return { imgUrl: undefined };

  if (typeof forwardedUrl !== "string" || !isOwnChatImage(forwardedUrl)) {
    return { error: "Invalid image" };
  }
  return { imgUrl: forwardedUrl };
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
    const senderId = req.user._id;

    let conversation;

    const { imgUrl, error } = await resolveMessageImage(req);

    if (error) {
      return res.status(400).json({ message: error });
    }

    if (!content?.trim() && !imgUrl) {
      return res.status(400).json({ message: "Content or an image is required" });
    }

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);

      // the conversation must be the one between the sender and the recipient
      const members = conversation?.participants.map((p) => p.userId.toString());
      if (
        conversation &&
        !(
          conversation.type === "direct" &&
          members.includes(senderId.toString()) &&
          members.includes(String(recipientId))
        )
      ) {
        return res.status(403).json({ message: "You are not in this conversation" });
      }
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

    const { imgUrl, error } = await resolveMessageImage(req);

    if (error) {
      return res.status(400).json({ message: error });
    }

    if (!content?.trim() && !imgUrl) {
      return res.status(400).json({ message: "Content or an image is required" });
    }

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
