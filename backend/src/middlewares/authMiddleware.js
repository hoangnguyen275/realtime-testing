// @ts-nocheck
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// authorization - verify the user identity
export const protectedRoute = (req, res, next) => {
  try {
    // get the token from the header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: "Access token not found" });
    }

    // validate the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedUser) => {
      if (err) {
        console.error(err);

        return res
          .status(403)
          .json({ message: "Access token has expired or is invalid" });
      }

      // find the user
      const user = await User.findById(decodedUser.userId).select("-hashedPassword");

      if (!user) {
        return res.status(404).json({ message: "user does not exist." });
      }

      // attach the user to req
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Error while verifying JWT in authMiddleware", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
