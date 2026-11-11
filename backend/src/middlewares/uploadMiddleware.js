import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1, // 1MB
  },
});

const messageImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
}).single("file");

// Optional image on a chat message (multipart field "file"). Plain JSON requests pass through.
export const uploadMessageImage = (req, res, next) => {
  messageImageUpload(req, res, (error) => {
    if (!error) return next();

    const message =
      error.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller" : error.message;
    return res.status(400).json({ message });
  });
};

export const uploadImageFromBuffer =(buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "terces_chat/avatars",
        resource_type: "image",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};
