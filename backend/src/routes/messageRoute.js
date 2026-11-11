import express from "express";

import {
  sendDirectMessage,
  sendGroupMessage,
} from "../controllers/messageController.js";
import {
  checkFriendship,
  checkGroupMembership,
} from "../middlewares/friendMiddleware.js";

import { uploadMessageImage } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// uploadMessageImage must run first so multipart fields are parsed into req.body
router.post("/direct", uploadMessageImage, checkFriendship, sendDirectMessage);
router.post("/group", uploadMessageImage, checkGroupMembership, sendGroupMessage);

export default router;
