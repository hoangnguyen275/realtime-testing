// @ts-nocheck
import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";

const ACCESS_TOKEN_TTL = "30m"; // usually under 15 minutes
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email || !firstName || !lastName) {
      return res.status(400).json({
        message: "username, password, email, firstName, and lastName are required",
      });
    }

    // check whether the username already exists
    const duplicate = await User.findOne({ username });

    if (duplicate) {
      return res.status(409).json({ message: "Username already exists" });
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // salt = 10

    // create a new user
    await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${lastName} ${firstName}`,
    });

    // return
    return res.sendStatus(204);
  } catch (error) {
    console.error("Error while calling signUp", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signIn = async (req, res) => {
  try {
    // get the inputs
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username or password is required." });
    }

    // get the hashed password from the database to compare with the password input
    const user = await User.findOne({ username });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });
    }

    // check the password
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordCorrect) {
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });
    }

    // if they match, create an access token with JWT
    const accessToken = jwt.sign(
      { userId: user._id },
      // @ts-ignore
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // create a refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // create a new session to store the refresh token
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // return the refresh token in a cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none", //backend and frontend deployed separately
      maxAge: REFRESH_TOKEN_TTL,
    });

    // return the access token in the response
    return res
      .status(200)
      .json({ message: `User ${user.displayName} logged in!`, accessToken });
  } catch (error) {
    console.error("Error while calling signIn", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signOut = async (req, res) => {
  try {
    // get the refresh token from the cookie
    const token = req.cookies?.refreshToken;

    if (token) {
      // delete the refresh token from the session
      await Session.deleteOne({ refreshToken: token });

      // delete the cookie
      res.clearCookie("refreshToken");
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error("Error while calling signOut", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// create a new access token from the refresh token
export const refreshToken = async (req, res) => {
  try {
    // get the refresh token from the cookie
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Token does not exist." });
    }

    // compare it with the refresh token in the database
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      return res.status(403).json({ message: "Token is invalid or has expired" });
    }

    // check whether it has expired
    if (session.expiresAt < new Date()) {
      return res.status(403).json({ message: "Token has expired." });
    }

    // create a new access token
    const accessToken = jwt.sign(
      {
        userId: session.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // return
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error while calling refreshToken", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
