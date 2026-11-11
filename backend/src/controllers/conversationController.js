import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    if (
      !type ||
      (type === "group" && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Group name and member list are required" });
    }

    let conversation;

    if (type === "direct") {
      const participantId = memberIds[0];

      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
      });

      // starting a chat again brings back a conversation the user deleted
      const me = conversation?.participants.find(
        (p) => p.userId.toString() === userId.toString()
      );
      if (me?.hidden) {
        me.hidden = false;
        await conversation.save();
      }

      if (!conversation) {
        conversation = new Conversation({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });

        await conversation.save();
      }
    }

    if (type === "group") {
      conversation = new Conversation({
        type: "group",
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: {
          name,
          createdBy: userId,
        },
        lastMessageAt: new Date(),
      });

      await conversation.save();
    }

    if (!conversation) {
      return res.status(400).json({ message: "Conversation type is invalid" });
    }

    await conversation.populate([
      { path: "participants.userId", select: "displayName avatarUrl" },
      {
        path: "seenBy",
        select: "displayName avatarUrl",
      },
      { path: "lastMessage.senderId", select: "displayName avatarUrl" },
    ]);

    const participants = (conversation.participants || []).map((p) => ({
      _id: p.userId?._id,
      displayName: p.userId?.displayName,
      avatarUrl: p.userId?.avatarUrl ?? null,
      joinedAt: p.joinedAt,
    }));

    const formatted = { ...conversation.toObject(), participants };

    if (type === "group") {
      memberIds.forEach((userId) => {
        io.to(userId).emit("new-group", formatted);
      });
    }

    if (type === "direct") {
      io.to(userId).emit("new-group", formatted);
      io.to(memberIds[0]).emit("new-group", formatted);
    }

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Error while creating conversation", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      participants: { $elemMatch: { userId, hidden: { $ne: true } } },
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    const formatted = conversations.map((convo) => {
      const participants = (convo.participants || []).map((p) => ({
        _id: p.userId?._id,
        displayName: p.userId?.displayName,
        avatarUrl: p.userId?.avatarUrl ?? null,
        joinedAt: p.joinedAt,
      }));

      return {
        ...convo.toObject(),
        unreadCounts: convo.unreadCounts || {},
        participants,
      };
    });

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error("Error while loading conversations", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;

    const conversation = await Conversation.findById(conversationId).select(
      "participants"
    );
    const me = conversation?.participants.find(
      (p) => p.userId.toString() === req.user._id.toString()
    );

    if (!me) {
      return res.status(404).json({ message: "Conversation does not exist" });
    }

    const query = { conversationId };

    // hide anything from before the user deleted the conversation
    if (me.clearedAt) {
      query.createdAt = { $gt: me.clearedAt };
    }

    if (cursor) {
      query.createdAt = { ...query.createdAt, $lt: new Date(cursor) };
    }

    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);

    let nextCursor = null;

    if (messages.length > Number(limit)) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }

    messages = messages.reverse();

    return res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("Error while loading messages", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 },
    );

    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Error while fetch conversations: ", error);
    return [];
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ message: "Conversation does not exist" });
    }

    const last = conversation.lastMessage;

    if (!last) {
      return res.status(200).json({ message: "There are no messages to mark as seen" });
    }

    if (last.senderId.toString() === userId) {
      return res.status(200).json({ message: "The sender does not need to mark messages as seen" });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      {
        new: true,
      },
    );

    io.to(conversationId).emit("read-message", {
      conversation: updated,
      lastMessage: {
        _id: updated?.lastMessage._id,
        content: updated?.lastMessage.content,
        createdAt: updated?.lastMessage.createdAt,
        sender: {
          _id: updated?.lastMessage.senderId,
        },
      },
    });

    return res.status(200).json({
      message: "Marked as seen",
      seenBy: updated?.sennBy || [],
      myUnreadCount: updated?.unreadCounts[userId] || 0,
    });
  } catch (error) {
    console.error("Error while mark as seen", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// "Delete conversation": removes it for the current user only
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, "participants.userId": userId },
      {
        $set: {
          "participants.$.hidden": true,
          "participants.$.clearedAt": new Date(),
          [`unreadCounts.${userId}`]: 0,
        },
      },
      { new: true },
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation does not exist" });
    }

    // nobody can see it anymore, so remove the data too
    if (conversation.participants.every((p) => p.hidden)) {
      await Message.deleteMany({ conversationId });
      await Conversation.findByIdAndDelete(conversationId);
    }

    io.to(userId).emit("conversation-removed", { conversationId });

    return res.status(200).json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Error while deleting conversation", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const muteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { muted } = req.body;
    const userId = req.user._id;

    if (typeof muted !== "boolean") {
      return res.status(400).json({ message: "muted must be true or false" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, "participants.userId": userId },
      muted ? { $addToSet: { mutedBy: userId } } : { $pull: { mutedBy: userId } },
      { new: true },
    ).select("mutedBy");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation does not exist" });
    }

    return res.status(200).json({ mutedBy: conversation.mutedBy });
  } catch (error) {
    console.error("Error while muting conversation", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userIdStr = userId.toString();

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, type: "group", "participants.userId": userId },
      {
        $pull: { participants: { userId }, mutedBy: userId, seenBy: userId },
        $unset: { [`unreadCounts.${userIdStr}`]: "" },
      },
      { new: true },
    );

    if (!conversation) {
      return res.status(404).json({ message: "Group does not exist" });
    }

    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId });
      await Conversation.findByIdAndDelete(conversationId);
    } else {
      io.to(conversationId).emit("member-left", { conversationId, userId: userIdStr });
    }

    // stop receiving this group's events on every tab of the user
    io.in(userIdStr).socketsLeave(conversationId);
    io.to(userIdStr).emit("conversation-removed", { conversationId });

    return res.status(200).json({ message: "You left the group" });
  } catch (error) {
    console.error("Error while leaving group", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
