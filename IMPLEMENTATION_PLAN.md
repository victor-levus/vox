# Implementation Plan — VideoCall App

> Steps are executed one at a time, only after explicit approval.
> Status: `[ ]` pending · `[x]` done · `[-]` in progress

---

## Phase 1 — Foundation & Infrastructure

### Step 1 — Project Scaffolding ✅
- [x] Create `frontend/` with Vite + React + TypeScript
- [x] Create `backend/` with Node.js + TypeScript
- [x] Install all frontend dependencies (react-router-dom, axios, socket.io-client, @reduxjs/toolkit, react-redux, react-icons, tailwindcss v4, @tailwindcss/vite, shadcn/ui core packages)
- [x] Install all backend dependencies (express, express-session, cookie-parser, cors, helmet, morgan, prisma 7, @prisma/client, @prisma/adapter-mariadb, zod, bcryptjs, nodemailer, socket.io, uuid)
- [x] Configure `tsconfig.json` for both (backend includes `"types": ["node"]`)
- [x] Configure Tailwind v4 — `@tailwindcss/vite` plugin, `@plugin` in CSS, `@config` directive
- [x] Configure `shadcn/ui` (`components.json`, CSS variables, `src/lib/utils.ts`)
- [x] Set up ESLint + Prettier for both
- [x] Create root `.env.example` and `.gitignore`
- [x] Full `src/` directory structure scaffolded (pages, store slices, services, hooks, types)
- [x] Fixed Prisma 7 datasource: `url` moved to `prisma.config.ts`, `@prisma/adapter-mariadb` installed

---

### Step 2 — Docker Compose Setup ✅
- [x] `docker-compose.yml` — 4 services: `db` (MySQL 8 + health check + named volume), `backend` (waits for db healthy), `frontend` (Nginx), `coturn` (host network for UDP)
- [x] `backend/Dockerfile` — multi-stage: install + `prisma generate` + `tsc` → copy `dist/` + prod deps
- [x] `frontend/Dockerfile` — multi-stage: Vite build with ARG-injected env vars → Nginx
- [x] `frontend/nginx.conf` — SPA fallback, gzip, 1yr asset cache, `/api/` + `/socket.io/` proxy to backend
- [x] `.dockerignore` for both services
- [x] `coturn/turnserver.conf` — TURN server config with placeholder IP/credentials

---

### Step 3 — Database Schema & Prisma Setup ✅
- [x] Configure `prisma/schema.prisma` with MySQL provider
- [x] Define all models:
  ```
  User        — id, name, email, password, avatar, createdAt, updatedAt
  Session     — id (sid), userId, data (Json), expiresAt, createdAt, updatedAt
  Room        — id, code (unique), name, hostId, isActive, createdAt, updatedAt
  Participant — id, userId, roomId, role, joinedAt, leftAt
  Message     — id, roomId, senderId, content, type, createdAt
  Invitation  — id, roomId, invitedEmail, token (unique), expiresAt, accepted
  ```
- [x] Define all relations and indexes (Session.userId, Room.code, Invitation.token)
- [ ] Run initial migration (`npx prisma migrate dev --name init` from `backend/`) — requires DB up
- [x] Write `prisma/seed.ts` — 2 test users + 1 sample room
- [x] Add `prisma db seed` script to `package.json`
- [x] `prisma.config.ts` — `import 'dotenv/config'` added as first import (Prisma 7 does not auto-load `.env`)
- [x] `docker-compose.yml` db port remapped `3307:3306` (avoids conflict with local MySQL on 3306)
- [x] `.env` + `backend/.env` created from `.env.example`

---

## Phase 2 — Backend Core

### Step 4 — Express App Bootstrap ✅
- [x] `src/config/env.ts` — Zod env validation, typed `config` singleton; exits on invalid vars
- [x] `src/config/sessionStore.ts` — custom `PrismaSessionStore` (get/set/destroy/touch)
- [x] `src/config/prisma.ts` — singleton PrismaClient with `@prisma/adapter-mariadb`
- [x] `src/types/express.d.ts` — `declare module 'express-session'` adds `userId` to `SessionData`
- [x] `src/utils/asyncHandler.ts` — wraps async handlers, forwards errors to next()
- [x] `src/middleware/auth.middleware.ts` — `requireAuth`: checks `req.session.userId`, 401 if absent
- [x] `src/middleware/validate.middleware.ts` — `validate(schema, target?)`: Zod parse on body/params/query, 400 on failure
- [x] `src/middleware/error.middleware.ts` — `errorHandler` + `AppError` class
- [x] `src/app.ts` — helmet, cors, morgan, json, cookie-parser, session middleware; `GET /api/health`; module router stubs commented in
- [x] `src/server.ts` — HTTP server + Socket.io init (CORS); handlers stubbed for Step 10
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 5 — Auth Module ✅
- [x] `auth.schema.ts` — `RegisterSchema` (name, email, password min 8, confirmPassword with `.refine` equality check) + `LoginSchema`
- [x] `auth.service.ts` — register (409 on duplicate), login (401 on bad creds, bcrypt 12 rounds), logout (session.destroy), getMe; password never returned (Prisma `select` or destructure)
- [x] `auth.routes.ts` — POST /register, POST /login, POST /logout, GET /me; all use `asyncHandler`
- [x] `app.ts` — `authRouter` imported and mounted at `/api/auth`
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 6 — Users Module ✅
- [x] `users.schema.ts` — `UpdateProfileSchema` (name/avatar optional), `ChangePasswordSchema` (with `.refine` match check)
- [x] `users.service.ts` — getProfile, updateProfile, changePassword (bcrypt verify + 12-round hash), searchUsers (OR name/email contains, take 10); password never returned via `select`
- [x] `users.routes.ts` — GET /profile, PUT /profile, PUT /password, GET /search?q=; all behind `requireAuth`
- [x] `app.ts` — `usersRouter` mounted at `/api/users`
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 7 — Rooms Module ✅
- [x] `rooms.schema.ts` — `CreateRoomSchema` with `.default('My Meeting')`
- [x] `rooms.service.ts` — `uniqueCode()` generates collision-free 10-char alphanumeric code; `ROOM_SELECT` includes `host` sub-select; `getMyRooms` queries host OR participant with `_count`; `endRoom` 403 if not host
- [x] `rooms.routes.ts` — POST /, GET /my, GET /:code, DELETE /:id; params cast via `as { code: string }` (Express 5 types params as `string | string[]`)
- [x] `app.ts` — `roomsRouter` mounted at `/api/rooms`
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 8 — Invitations Module ✅
- [x] `invitations.schema.ts` — `CreateInvitationSchema`: roomId, emails array of email strings, sendEmail boolean with `.default(false)`
- [x] `invitations.service.ts` — `createInvitations`: 403 if not host, UUID token per email, 7-day TTL, optional nodemailer send via `Promise.allSettled` (failures don't abort); `resolveInvitation`: 410 on expired/accepted; `acceptInvitation`: marks accepted, returns roomCode
- [x] `invitations.routes.ts` — POST /, GET /:token (public), POST /:token/accept; params cast via `as { token: string }`
- [x] `app.ts` — `invitationsRouter` mounted at `/api/invitations`
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 9 — Messages Module ✅
- [x] `messages.schema.ts`:
  - `GetMessagesSchema` — cursor (optional), limit (optional, default 50)
- [x] `messages.service.ts`:
  - `getRoomMessages(roomId, userId, cursor, limit)` — verify user was participant, paginated fetch ordered by createdAt desc
  - `deleteMessage(messageId, userId)` — verify sender is requester, soft or hard delete
  - `saveMessage(roomId, senderId, content, type)` — internal, called by socket chat handler
- [x] `messages.routes.ts`:
  - `GET /api/rooms/:roomId/messages` → requireAuth + validate query → service.getRoomMessages
  - `DELETE /api/messages/:id` → requireAuth → service.deleteMessage
- [x] `app.ts` — `messagesRouter` mounted at `/api`
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

## Phase 3 — WebSocket & WebRTC Signaling

### Step 10 — Socket.io Server & Room Events ✅
- [x] `src/config/session.ts` — extracted shared session middleware (used by both Express and Socket.io)
- [x] `websocket/socket.ts` — `initSocket(httpServer)`: creates Server, two-phase auth middleware (session via express-session → reject if no userId), registers room handlers; exported io via server.ts
- [x] `websocket/handlers/room.handler.ts`:
  - `join-room` — validate room exists, upsert Participant row (create if no active record), join socket channel, emit `participant-list` to joiner (with socketIds for WebRTC mesh), emit `user-joined` to rest
  - `leave-room` — remove from in-memory map, emit `user-left`, update Participant.leftAt in DB
  - `disconnect` — reuses leaveRoom() logic
  - In-memory `rooms: Map<roomCode, Map<socketId, RoomMember>>` + `socketToRoom` map for O(1) cleanup
- [x] `server.ts` — calls `initSocket(server)`, exports `io`
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 11 — WebRTC Signaling Handler ✅
- [x] `websocket/handlers/signaling.handler.ts` — pure relay, no DB:
  - `offer` — relays `{ sdp }` to `targetSocketId`, appends `fromSocketId: socket.id`
  - `answer` — same pattern
  - `ice-candidate` — relays `{ candidate }` to `targetSocketId`, appends `fromSocketId`
- [x] Mesh topology bootstrap already handled by room.handler `PARTICIPANT_LIST` — joiner receives all current socketIds and initiates offers
- [x] `socket.ts` — `registerSignalingHandlers` added to connection handler
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

### Step 12 — Real-time Chat Handler ✅
- [x] `websocket/handlers/chat.handler.ts`:
  - `send-message` — trims content, resolves roomId via DB, calls `saveMessage()`, broadcasts `new-message` to whole room (sender included, so they get the persisted ID/createdAt)
  - `typing` — reads member name from in-memory map (no DB hit), broadcasts `user-typing { userId, name }` to room excluding sender
  - `stop-typing` — broadcasts `user-stop-typing { userId }` to room excluding sender
- [x] `room.handler.ts` — exported `getSocketMember(socketId)` helper used by chat handler
- [x] `websocket/events.ts` — already complete; all constants used by all handlers and available for frontend
- [x] `socket.ts` — `registerChatHandlers` added to connection handler
- [x] TypeScript clean — `tsc --noEmit` passes with zero errors

---

## Phase 4 — Frontend Core

### Step 13 — Frontend Base Setup ✅
- [x] Install and init shadcn/ui components: Button, Input, Label, Avatar, Badge, Tooltip, Sheet, Dialog, DropdownMenu, Separator, Skeleton, Toaster (sonner)
- [x] Configure React Router v6 with routes:
  - `/login`, `/register` — public
  - `/dashboard` — protected
  - `/lobby/:code` — protected
  - `/room/:code` — protected
  - `/invite/:token` — public
- [x] `<PrivateRoute>` — redirect to `/login` if no active session
- [x] Redux Toolkit store with slices:
  - `authSlice` — user object, loading, error
  - `meetingSlice` — roomCode, roomName, isActive, isMuted, isCameraOff, isScreenSharing
  - `chatSlice` — messages array, unreadCount, isOpen
  - `participantsSlice` — participants array, raisedHands
  - `uiSlice` — activePanel (chat/participants/none), toasts, modals
- [x] `services/api.ts` — axios instance with `baseURL`, `withCredentials: true`, response interceptor for 401 → redirect to login
- [x] `services/socket.service.ts` — singleton Socket.io client, connect/disconnect helpers
- [x] `types/index.ts` — shared TS interfaces: `User`, `Room`, `Message`, `Participant`, `SocketEvents`

---

### Step 14 — Auth Pages
- [ ] `pages/Auth/LoginPage.tsx` — email + password form, error display, link to register, calls `POST /api/auth/login`, dispatches to authSlice, redirects to `/dashboard`
- [ ] `pages/Auth/RegisterPage.tsx` — name + email + password + confirm form, calls `POST /api/auth/register`, auto-login on success
- [ ] On app load: call `GET /api/auth/me` to hydrate auth state if session cookie exists
- [ ] Loading state while session check is in flight (full-page spinner)
- [ ] Form validation with react-hook-form + Zod (`zodResolver`)

---

### Step 15 — Dashboard / Home Page
- [ ] `pages/Dashboard/DashboardPage.tsx`:
  - Header with user avatar, name, logout button
  - "New Meeting" button → `POST /api/rooms` → navigate to `/lobby/:code`
  - "Join Meeting" input + button → navigate to `/lobby/:code`
  - "My Meetings" list from `GET /api/rooms/my`:
    - Room name, date, participant count
    - "Start" / "Copy Link" / "Invite" actions per room
- [ ] Copy invite link to clipboard with toast confirmation
- [ ] Empty state when no rooms yet

---

## Phase 5 — Meeting Room

### Step 16 — Lobby / Pre-join Screen
- [ ] `pages/Lobby/LobbyPage.tsx`:
  - Fetch room info via `GET /api/rooms/:code` (404 redirect if invalid)
  - Camera preview tile using `getUserMedia({ video: true, audio: true })`
  - Toggle camera and microphone before joining
  - Display name field (pre-filled from auth user)
  - Device selectors for camera and microphone
  - "Join Now" button → navigate to `/room/:code`
  - If room not yet started by host: "Waiting for host…" state
- [ ] Stop all preview tracks on unmount

---

### Step 17 — WebRTC & Media Hooks
- [ ] `hooks/useMedia.ts`:
  - Acquire local `MediaStream` with `getUserMedia`
  - `toggleAudio()` — enable/disable audio track
  - `toggleVideo()` — enable/disable video track
  - `startScreenShare()` — `getDisplayMedia`, returns screen stream
  - `stopScreenShare()` — stop screen tracks, revert to camera
  - Return: `localStream`, `isAudioEnabled`, `isVideoEnabled`, `isScreenSharing`
- [ ] `hooks/useWebRTC.ts`:
  - Manage `Map<socketId, RTCPeerConnection>`
  - On `user-joined`: create offer, send via socket
  - On `offer`: create answer, send via socket
  - On `answer`: set remote description
  - On `ice-candidate`: add ICE candidate
  - On `user-left`: close and remove peer connection
  - ICE servers from env (STUN + TURN)
  - Return: `remoteStreams: Map<socketId, MediaStream>`, `peers`
- [ ] `hooks/useSocket.ts`:
  - Connect on mount, disconnect on unmount
  - Emit `join-room` with roomCode + userId on connect
  - Re-export typed event emitters and listeners

---

### Step 18 — Meeting Room Page & Video Grid
- [ ] `pages/Meeting/MeetingRoomPage.tsx` — orchestrates all hooks, renders grid + toolbar + panels
- [ ] `components/meeting/VideoGrid.tsx`:
  - Responsive CSS grid layouts by participant count:
    - 1 → full screen
    - 2 → side by side
    - 3–4 → 2×2
    - 5–9 → 3×3
    - 9+ → scrollable grid
  - Featured/spotlight tile for pinned or screen-sharing participant
- [ ] `components/meeting/VideoTile.tsx`:
  - Renders `<video>` element with `srcObject = stream`
  - Name label overlay
  - Audio level indicator (animated ring)
  - Camera-off fallback (avatar + name)
  - "You" badge on local tile
  - Pin button on hover

---

### Step 19 — Meeting Controls Toolbar
- [ ] `components/meeting/Toolbar.tsx` — fixed bottom bar with:
  - Mute / Unmute mic (with active audio level animation)
  - Camera on / off
  - Screen share toggle
  - Chat toggle (with unread badge)
  - Participants toggle (with count badge)
  - Reactions picker (emoji grid popup)
  - Raise hand toggle
  - Settings button (opens Settings modal)
  - Leave call / End for all (host gets "End for all" option)
- [ ] Call duration timer (counts up from join time)
- [ ] Mic and camera device quick-selector dropdown (via `enumerateDevices`)

---

### Step 20 — Chat Panel
- [ ] `components/chat/ChatPanel.tsx` — Sheet (slide-in) component:
  - Message history loaded from `GET /api/rooms/:roomId/messages` on open
  - Real-time messages appended via socket `new-message` event
  - Scroll-to-bottom on new messages
  - Unread count badge cleared on open
- [ ] `components/chat/MessageBubble.tsx`:
  - Own messages right-aligned (primary color)
  - Others left-aligned (neutral)
  - Sender name + avatar for others
  - Timestamp
  - File attachment display
- [ ] `components/chat/ChatInput.tsx`:
  - Text input, send on Enter (Shift+Enter for newline)
  - Emoji picker button
  - File attachment button
  - Typing indicator shown above input when others are typing

---

### Step 21 — Participants Panel
- [ ] `components/meeting/ParticipantsPanel.tsx` — Sheet (slide-in):
  - List all participants with avatar, name, host badge
  - Audio/video status icons per participant
  - Raised hand indicator (sorted to top)
  - Host actions per participant (three-dot menu):
    - Mute participant (emit `mute-participant` socket event)
    - Remove from meeting (emit `remove-participant`, target socket disconnects from room)
    - Transfer host role
  - "Invite" button at top → opens invite dialog

---

## Phase 6 — Advanced Features

### Step 22 — Meet Invitations & Share
- [ ] "Invite" dialog in Participants Panel:
  - "Copy link" button — copies `{CLIENT_URL}/invite/:token`
  - QR code display for the room link (using `qrcode.react`)
  - Email invite tab — multi-email input, calls `POST /api/invitations`
  - User search tab — search registered users, send invite
- [ ] `pages/Invite/InviteLandingPage.tsx` — `/invite/:token`:
  - Call `GET /api/invitations/:token` to get room + inviter info
  - Show meeting details + "Join Meeting" CTA
  - If unauthenticated: prompt login/register first, then redirect to lobby
  - If expired/invalid: show error state

---

### Step 23 — Screen Sharing
- [ ] `getDisplayMedia` called from `useMedia.toggleScreenShare()`
- [ ] Replace video track in all existing `RTCPeerConnection` instances (renegotiate)
- [ ] Emit `screen-share-started` / `screen-share-stopped` socket events so all peers know whose tile to feature
- [ ] Screen share tile rendered as full-featured primary view in `VideoGrid`
- [ ] "Stop sharing" button visible only to the sharer (browser native bar also stops it)
- [ ] On screen share track `onended` (user clicks browser stop button): auto-revert to camera

---

### Step 24 — Reactions & Raise Hand
- [ ] `components/meeting/ReactionPicker.tsx` — emoji grid popup (6–8 common emojis)
- [ ] On reaction selected: emit `reaction { emoji, userId }` socket event, broadcast to room
- [ ] `components/meeting/ReactionOverlay.tsx` — floating emoji animations per `VideoTile` (CSS keyframe float-up, fade-out after 3s)
- [ ] Raise hand: emit `raise-hand` / `lower-hand`, update `participantsSlice`
- [ ] Raised-hand participants sorted to top of Participants Panel list
- [ ] Hand icon badge on their `VideoTile`

---

### Step 25 — Settings & Device Management
- [ ] `components/meeting/SettingsModal.tsx` — Dialog:
  - Audio input selector (microphone list from `enumerateDevices`)
  - Audio output selector (speaker list)
  - Video input selector (camera list)
  - Preview pane for selected camera
  - Background effect toggle: none / blur / (placeholder for virtual bg)
  - Layout preference: grid / spotlight / sidebar
- [ ] Persist layout preference to `localStorage`
- [ ] Apply audio output selection via `HTMLMediaElement.setSinkId()` where supported

---

### Step 26 — Recording
- [ ] Recording available to host only
- [ ] `useRecording` hook:
  - Capture canvas composite of VideoGrid using `captureStream()` + `MediaRecorder`
  - `startRecording()` — emit `recording-started` socket event (shows red dot to all)
  - `stopRecording()` — emit `recording-stopped`, trigger `.webm` file download
- [ ] Visual "REC" indicator in Toolbar for all participants during recording
- [ ] Confirm dialog before starting ("Recording will be visible to all participants")

---

## Phase 7 — Polish & Deployment

### Step 27 — Notifications & UX Polish
- [ ] Toast notifications (shadcn Toaster) for:
  - Participant join / leave
  - Host ended meeting
  - You were muted by host
  - Invite sent / copy link success
  - Error states
- [ ] Loading skeletons for Dashboard room list and Participants Panel
- [ ] Responsive layout audit for mobile browser (no RN yet, but browser on phone)
- [ ] Keyboard navigation + ARIA labels on all interactive controls
- [ ] Dark mode via Tailwind `dark:` classes + `prefers-color-scheme` detection
- [ ] Page `<title>` updates per route (meeting room shows room name)

---

### Step 28 — Security & Production Hardening
- [ ] Rate limiting on auth endpoints (`express-rate-limit`): 10 req/min for login, 5 req/min for register
- [ ] All route inputs validated with Zod (already done per module, final audit)
- [ ] Session cookie hardened: `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`
- [ ] CORS locked to production domain in env
- [ ] Socket.io auth rejects all unauthenticated handshakes
- [ ] Helmet security headers configured
- [ ] Expired session pruning — a startup interval that deletes `Session` rows where `expiresAt < NOW()` every 30 min
- [ ] Input sanitisation on chat messages (strip HTML)
- [ ] File upload size limits if file sharing is added

---

### Step 29 — Production Docker Build
- [ ] Finalise multi-stage `backend/Dockerfile`:
  - Stage 1: install deps + compile TS
  - Stage 2: copy compiled output + production deps only
- [ ] Finalise multi-stage `frontend/Dockerfile`:
  - Stage 1: Vite build
  - Stage 2: Nginx with custom `nginx.conf`
- [ ] `docker-compose.prod.yml`:
  - All services with `restart: unless-stopped`
  - Secrets via env-file (not baked into image)
  - Internal Docker network (backend not exposed to host)
  - Named volumes for MySQL data
- [ ] `coturn` config file for production domain + TLS
- [ ] Validate full stack boots and all features work inside containers

---

## Phase 8 — Future Phases (Post Web App)

### Step 30 — React Native Mobile App
- [ ] New `mobile/` directory (separate RN project)
- [ ] Shared `packages/types/` — TypeScript interfaces reused across web, mobile, desktop
- [ ] `react-native-webrtc` for video/audio
- [ ] `socket.io-client` — same backend, same events
- [ ] Bottom tab navigation (Home, Meetings, Settings)
- [ ] Mobile-first meeting UI with swipe gestures

---

### Step 31 — Electron Desktop App
- [ ] New `desktop/` directory (Electron + React)
- [ ] Electron shell wrapping the React frontend build
- [ ] Native OS notifications via Electron `Notification` API
- [ ] System tray icon with quick "New Meeting" action
- [ ] `electron-updater` for auto-updates
- [ ] Deep link handling (`videocall://invite/:token`)

---

## Step Summary

| # | Step | Phase |
|---|------|-------|
| 1 | Project Scaffolding | Foundation |
| 2 | Docker Compose Setup | Foundation |
| 3 | Database Schema & Prisma | Foundation |
| 4 | Express Bootstrap + Session | Backend |
| 5 | Auth Module | Backend |
| 6 | Users Module | Backend |
| 7 | Rooms Module | Backend |
| 8 | Invitations Module | Backend |
| 9 | Messages Module | Backend |
| 10 | Socket.io Server + Room Events | WebSocket |
| 11 | WebRTC Signaling Handler | WebSocket |
| 12 | Real-time Chat Handler | WebSocket |
| 13 | Frontend Base Setup | Frontend |
| 14 | Auth Pages | Frontend |
| 15 | Dashboard / Home Page | Frontend |
| 16 | Lobby / Pre-join Screen | Meeting Room |
| 17 | WebRTC & Media Hooks | Meeting Room |
| 18 | Meeting Room Page & Video Grid | Meeting Room |
| 19 | Meeting Controls Toolbar | Meeting Room |
| 20 | Chat Panel | Meeting Room |
| 21 | Participants Panel | Meeting Room |
| 22 | Meet Invitations & Share | Advanced |
| 23 | Screen Sharing | Advanced |
| 24 | Reactions & Raise Hand | Advanced |
| 25 | Settings & Device Management | Advanced |
| 26 | Recording | Advanced |
| 27 | Notifications & UX Polish | Polish |
| 28 | Security & Production Hardening | Polish |
| 29 | Production Docker Build | Polish |
| 30 | React Native Mobile App | Future |
| 31 | Electron Desktop App | Future |
