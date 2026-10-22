<div align="center">

<img src="frontend/public/logo.svg" alt="Terces logo" width="80" />

# Terces — Real-Time Chat App

A full-stack, real-time messaging application with direct and group chats, friend management, online presence, and read receipts. Built with **React 19**, **Express 5**, **Socket.IO**, and **MongoDB**.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?logo=mongodb&logoColor=white)

[Live Demo](#) · [API Docs](#-api-documentation) · [Report a Bug](../../issues)

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Authentication Flow](#-authentication-flow)
- [Real-Time Events](#-real-time-events)
- [REST API Reference](#-rest-api-reference)
- [Data Models](#-data-models)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)

---

## ✨ Features

### 💬 Messaging
- **Real-time direct messages** between friends, delivered instantly over WebSockets.
- **Group chats**: create a group, name it, and invite friends.
- **Unread message counters** per conversation, per user.
- **Read receipts**: the last message shows *Delivered* or *Seen*.
- **Infinite scroll** message history with cursor-based pagination (50 messages per page).
- **Emoji picker** in the message composer (powered by Emoji Mart).
- **Last-message previews** with conversations sorted by most recent activity.

### 👥 Social
- **Search users** by username.
- **Send friend requests** with an optional message (up to 300 characters).
- **Accept or decline** received requests and view sent requests.
- **Friends-only messaging**: direct messages and group invites are restricted to accepted friends, enforced on the server.
- **Online presence**: live green-dot indicators for friends who are online.

### 🔐 Accounts & Profile
- **Sign up / sign in / sign out** with form validation (React Hook Form + Zod).
- **JWT access tokens with rotating sessions**: short-lived access tokens plus a 14-day refresh token in an `httpOnly` cookie.
- **Silent token refresh** with an Axios interceptor; the session survives page reloads.
- **Avatar upload** to Cloudinary (auto-cropped to 200×200, max 1 MB).
- **Profile dialog** with personal info, preferences, and privacy sections.
- **Light / dark mode**, remembered across sessions.

### 🧑‍💻 Developer Experience
- **Swagger UI** API documentation at `/api-docs`.
- **shadcn/ui** component library built on Radix UI primitives.
- **Loading skeletons** for the conversation list and chat window.
- **Toast notifications** with Sonner.
- **Fully typed** frontend (TypeScript) with typed Zustand stores.

---

## 🧰 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 4, shadcn/ui (Radix UI), Zustand, Axios, Socket.IO Client, React Hook Form, Zod, Emoji Mart, Sonner, Lucide icons |
| **Backend** | Node.js (ES Modules), Express 5, Socket.IO 4, Mongoose 8, JSON Web Token, bcrypt, cookie-parser, CORS, Multer, Cloudinary SDK, swagger-ui-express |
| **Database** | MongoDB (for example, MongoDB Atlas) |
| **Media storage** | Cloudinary |
| **Deployment** | Render (backend), any static host for the frontend |

---

## 🏗 Architecture

```
┌──────────────────────────┐        HTTPS (REST, JSON)        ┌──────────────────────────┐
│        Frontend          │ ───────────────────────────────▶ │         Backend          │
│  React + Vite + Zustand  │   Authorization: Bearer <JWT>    │   Express 5 + Mongoose   │
│                          │   Cookie: refreshToken           │                          │
│  Axios (auto-refresh)    │                                  │  /api/auth   (public)    │
│  Socket.IO client        │ ◀──────────────────────────────▶ │  /api/*      (protected) │
│                          │   WebSocket (Socket.IO + JWT)    │  Socket.IO server        │
└──────────────────────────┘                                  └────────────┬─────────────┘
                                                                           │
                                                      ┌────────────────────┼────────────────────┐
                                                      ▼                                         ▼
                                              ┌───────────────┐                         ┌───────────────┐
                                              │    MongoDB    │                         │  Cloudinary   │
                                              │ users, chats, │                         │   (avatars)   │
                                              │ messages, ... │                         └───────────────┘
                                              └───────────────┘
```

- **REST** handles commands and queries (sign in, send message, fetch history, and so on).
- **Socket.IO** pushes events to clients: new messages, read receipts, new groups, and online users.
- Each socket automatically joins a **room for every conversation** the user belongs to, plus a **personal room** (its user ID) for targeted notifications.


## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v20 or later**
- A **MongoDB** database (local or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- A free **[Cloudinary](https://cloudinary.com/)** account (for avatar uploads)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create `backend/.env` (see [Environment Variables](#-environment-variables)):

```env
PORT=5001
MONGODB_CONNECTIONSTRING=mongodb+srv://<user>:<password>@<cluster>/<db>
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=<a-long-random-string>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

> 💡 Generate a strong secret with:
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Start the server:

```bash
npm run dev
```

You should see:

```
Database connected successfully!
Server started on port 5001
```

### 3. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
```

The frontend reads its API location from `frontend/.env.development`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001/
```

Start the dev server:

```bash
npm run dev
```

Open **http://localhost:5173**, create two accounts (for example, in a normal window and a private window), add each other as friends, and start chatting in real time.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `PORT` | | Server port (default `5001`) |
| `MONGODB_CONNECTIONSTRING` | ✅ | MongoDB connection URI |
| `CLIENT_URL` | ✅ | Frontend origin allowed by CORS and Socket.IO (for example, `http://localhost:5173`) |
| `ACCESS_TOKEN_SECRET` | ✅ | Secret used to sign JWT access tokens |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |

### Frontend (`frontend/.env.development` / `frontend/.env.production`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the REST API, including `/api` |
| `VITE_SOCKET_URL` | Base URL of the Socket.IO server |

> ⚠️ **Never commit `backend/.env`.** It is already listed in `.gitignore`.

---

## 📜 Available Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `backend/` | `npm run dev` | Starts the API with Nodemon (auto-reload) |
| `backend/` | `npm start` | Starts the API with Node (production) |
| `frontend/` | `npm run dev` | Starts the Vite dev server |
| `frontend/` | `npm run build` | Type-checks and builds for production into `dist/` |
| `frontend/` | `npm run preview` | Serves the production build locally |
| `frontend/` | `npm run lint` | Runs ESLint |

---

## 🗂 Project Structure

```
realtime-app-testing/
├── backend/
│   └── src/
│       ├── server.js                # Express app, middleware, routes, Swagger, DB connect
│       ├── socket/index.js          # Socket.IO server, rooms, online-user tracking
│       ├── libs/db.js               # MongoDB connection
│       ├── controllers/             # auth, user, friend, conversation, message logic
│       ├── routes/                  # Route definitions per resource
│       ├── middlewares/
│       │   ├── authMiddleware.js    # Verifies JWT on protected REST routes
│       │   ├── socketMiddleware.js  # Verifies JWT on socket handshake
│       │   ├── friendMiddleware.js  # Friendship & group-membership checks
│       │   └── uploadMiddleware.js  # Multer (memory) + Cloudinary upload stream
│       ├── models/                  # User, Session, Friend, FriendRequest, Conversation, Message
│       ├── utils/messageHelper.js   # Updates unread counts & emits new-message events
│       └── swagger.json             # OpenAPI spec served at /api-docs
│
└── frontend/
    ├── public/                      # Logo and auth page illustrations
    └── src/
        ├── pages/                   # SignInPage, SignUpPage, ChatAppPage
        ├── components/
        │   ├── auth/                # Sign-in/up forms, ProtectedRoute, Logout
        │   ├── chat/                # Chat window, message list/input, conversation cards, modals
        │   ├── friendRequest/       # Sent / received request lists
        │   ├── AddFriendModal/      # Search user & send request
        │   ├── newGroupChat/        # Member picker for group creation
        │   ├── profile/             # Profile dialog, avatar uploader, preferences
        │   ├── sidebar/             # App sidebar & navigation
        │   ├── skeleton/            # Loading skeletons
        │   └── ui/                  # shadcn/ui primitives
        ├── stores/                  # Zustand: auth, chat, friend, socket, theme, user
        ├── services/                # API wrappers (auth, chat, friend, user)
        ├── lib/axios.ts             # Axios instance with token & refresh interceptors
        ├── types/                   # Shared TypeScript types
        └── App.tsx                  # Routes & socket lifecycle
```

---

## 🔐 Authentication Flow

1. **Sign in**: the server verifies the password with **bcrypt**, then returns:
   - a **JWT access token** (valid **30 minutes**) in the response body, kept in memory on the client;
   - a random **refresh token** (valid **14 days**) in an `httpOnly`, `secure`, `SameSite=None` cookie, and stored in a `Session` document.
2. **Authenticated requests** send `Authorization: Bearer <accessToken>`.
3. **Token expiry**: when an API call returns `403`, the Axios interceptor calls `POST /api/auth/refresh`, stores the new access token, and retries the original request.
4. **Page reload**: `ProtectedRoute` calls `/auth/refresh` to restore the session, then `/users/me` to load the profile.
5. **Sign out** deletes the session from the database and clears the cookie.
6. Expired sessions are removed automatically by a MongoDB **TTL index**.

The Socket.IO connection is authenticated the same way: the access token is sent in `handshake.auth.token` and verified by `socketAuthMiddleware`.

---

## ⚡ Real-Time Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `online-users` | server → all | `string[]` (user IDs) | Broadcast whenever a user connects or disconnects |
| `new-message` | server → conversation room | `{ message, conversation, unreadCounts }` | Deliver a new message and update previews/counters |
| `read-message` | server → conversation room | `{ conversation, lastMessage }` | Update read receipts and unread counts |
| `new-group` | server → member's personal room | `conversation` | Notify users they were added to a new group |
| `join-conversation` | client → server | `conversationId` | Join the room for a newly created group |

---

## 📡 REST API Reference

Base URL: `http://localhost:5001/api`. All routes except `/auth/*` require `Authorization: Bearer <accessToken>`.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register (`username`, `password`, `email`, `firstName`, `lastName`) |
| `POST` | `/auth/signin` | Sign in, returns `accessToken` and sets the refresh cookie |
| `POST` | `/auth/signout` | Sign out and invalidate the session |
| `POST` | `/auth/refresh` | Exchange the refresh cookie for a new access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/users/me` | Current user's profile |
| `GET`  | `/users/search?username=` | Find a user by username |
| `POST` | `/users/uploadAvatar` | Upload an avatar (`multipart/form-data`, field `file`, max 1 MB) |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/friends` | List friends |
| `GET`  | `/friends/requests` | List `sent` and `received` requests |
| `POST` | `/friends/requests` | Send a friend request (`to`, optional `message`) |
| `POST` | `/friends/requests/:requestId/accept` | Accept a request |
| `POST` | `/friends/requests/:requestId/decline` | Decline a request |

### Conversations & Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`   | `/conversations` | List the user's conversations (newest activity first) |
| `POST`  | `/conversations` | Create a direct (`recipientId`) or group (`name`, `memberIds`) conversation, friends only |
| `GET`   | `/conversations/:id/messages?limit=50&cursor=` | Paginated message history |
| `PATCH` | `/conversations/:id/seen` | Mark the conversation as seen |
| `POST`  | `/messages/direct` | Send a direct message (friends only) |
| `POST`  | `/messages/group` | Send a group message (members only) |

### 📘 API Documentation

Interactive Swagger docs are available while the server is running:

**http://localhost:5001/api-docs**

---

## 🧱 Data Models

| Model | Key Fields |
|-------|------------|
| **User** | `username` (unique, lowercase), `email` (unique), `hashedPassword`, `displayName`, `avatarUrl`, `avatarId`, `bio`, `phone` |
| **Session** | `userId`, `refreshToken` (unique), `expiresAt` (TTL index) |
| **FriendRequest** | `from`, `to`, `message` (max 300 chars); unique on `(from, to)` |
| **Friend** | `userA`, `userB`, stored in sorted order so each pair is unique |
| **Conversation** | `type` (`direct` / `group`), `participants[]`, `group { name, createdBy }`, `lastMessage`, `lastMessageAt`, `seenBy[]`, `unreadCounts` (Map) |
| **Message** | `conversationId`, `senderId`, `content`, `imgUrl`; indexed on `(conversationId, createdAt)` |

---

## ☁️ Deployment

**Backend (for example, Render)**
1. Create a new **Web Service** pointing to the `backend/` folder.
2. Build command: `npm install`. Start command: `npm start`.
3. Add every variable from [Backend env](#backend-backendenv). Set `CLIENT_URL` to your deployed frontend URL.

**Frontend (for example, Vercel or Netlify)**
1. Root directory: `frontend/`. Build command: `npm run build`. Output directory: `dist`.
2. Set `VITE_API_URL` and `VITE_SOCKET_URL` to your backend URL (see `frontend/.env.production`).
3. Add an SPA rewrite so every route serves `index.html`.

> Because the refresh cookie uses `SameSite=None; Secure`, both apps **must be served over HTTPS** in production.

---

## 🗺 Roadmap

- [ ] Image messages (the `imgUrl` field already exists in the schema)
- [ ] Typing indicators
- [ ] Save profile edits (personal info, bio) to the server
- [ ] Remove friends and leave groups
- [ ] Message edit and delete
- [ ] Push notifications
