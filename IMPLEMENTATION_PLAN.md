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

### Step 14 — Auth Pages ✅
- [x] `pages/Auth/LoginPage.tsx` — email + password form, error display, link to register, calls `POST /api/auth/login`, dispatches to authSlice, redirects to `/dashboard`
- [x] `pages/Auth/RegisterPage.tsx` — name + email + password + confirm form, calls `POST /api/auth/register`, auto-login on success
- [x] On app load: call `GET /api/auth/me` to hydrate auth state if session cookie exists (App.tsx useEffect)
- [x] Loading state while session check is in flight (full-page spinner — animated border-primary ring)
- [x] Form validation with react-hook-form + Zod (`zodResolver`)

---

### Step 15 — Dashboard / Home Page ✅
- [x] `pages/Dashboard/DashboardPage.tsx`:
  - Header with user avatar (initials fallback), name, logout button
  - "New Meeting" button → `POST /api/rooms` → navigate to `/lobby/:code`
  - "Join Meeting" input + button → navigate to `/lobby/:code`
  - "My Meetings" list from `GET /api/rooms/my` with Skeleton loading state
    - Room name, formatted date, participant count via `_count`
    - "Start" / DropdownMenu (Copy Link, Invite placeholder, Delete) per room
    - Live badge when `room.isActive`
- [x] Copy lobby link to clipboard with sonner toast confirmation
- [x] Empty state with dashed border + icon when no rooms
- [x] `<Toaster richColors />` added to App.tsx (available app-wide)

---

## Phase 5 — Meeting Room

### Step 16 — Lobby / Pre-join Screen ✅
- [x] `pages/Lobby/LobbyPage.tsx`:
  - Fetch room info via `GET /api/rooms/:code` (404 → toast + redirect to /dashboard)
  - Camera preview tile using `getUserMedia({ video, audio })` with mirrored video (`transform-[scaleX(-1)]`)
  - Toggle camera (stops tracks / restarts stream) and microphone (track.enabled toggle)
  - Display name field pre-filled from auth user
  - Device selectors (native `<select>`) for camera and microphone — populated after permission granted
  - "Join Now" button → navigate to `/room/:code`; disabled when name is empty
  - "Waiting for host" message shown when current user is not the host
  - Camera-off state shows avatar initials; mediaError state shows icon + text
- [x] Cleanup: `useEffect` return stops all tracks via `streamRef` on unmount

---

### Step 17 — WebRTC & Media Hooks ✅
- [x] `hooks/useMedia.ts`:
  - `getUserMedia({ video, audio })` on mount; cleanup stops all tracks on unmount
  - `toggleAudio()` / `toggleVideo()` — functional setState to avoid stale closure, flips `track.enabled`
  - `startScreenShare()` — `getDisplayMedia`; sets `track.onended` to auto-revert on browser stop button
  - `stopScreenShare()` — stop screen tracks, restore camera stream from `cameraStreamRef`
  - `useCallback` on all methods (stable refs for toolbar props)
- [x] `hooks/useWebRTC.ts`:
  - `PARTICIPANT_LIST` → joiner creates offers to all existing peers (joiner-initiates mesh)
  - `OFFER` → existing peer creates RTCPeerConnection + answer; flushes queued ICE candidates
  - `ANSWER` → joiner sets remote description; flushes queued ICE candidates
  - `ICE_CANDIDATE` → added immediately if remoteDescription set, else queued per peer
  - `USER_LEFT` → `removePeer`: close PC, delete from map, remove remote stream
  - `onconnectionstatechange` → auto-remove failed/closed connections
  - ICE servers (STUN + optional TURN) built from env at module load
- [x] `hooks/useSocket.ts`:
  - `socketService.connect()` on mount; emits `JOIN_ROOM` on connect (or immediately if already connected)
  - Emits `LEAVE_ROOM` + `socketService.disconnect()` on unmount
  - Returns `Socket | null` for use by `useWebRTC` and `useChat`
- [x] `src/vite-env.d.ts` — typed `ImportMetaEnv` for all `VITE_*` env vars

---

### Step 18 — Meeting Room Page & Video Grid ✅
- [x] `pages/Meeting/MeetingRoomPage.tsx`:
  - Orchestrates useMedia + useSocket + useWebRTC hooks
  - Fetches room via getRoomByCode; dispatches joinMeeting / cleanup on unmount
  - `roomRef` holds room id/hostId for socket participant role assignment
  - Separate socket useEffect maps PARTICIPANT_LIST / USER_JOINED / USER_LEFT → Redux participantsSlice
- [x] `components/meeting/VideoGrid.tsx`:
  - Builds `TileData[]` from local + remoteStreams (keyed by socketId, matched to Redux participants for name/state)
  - Grid layout: 1→1col, 2→2col, 3-4→2col, 5-9→3col, 9+→4col scrollable
  - Spotlight layout when a tile is pinned: large primary tile + horizontal strip of others
- [x] `components/meeting/VideoTile.tsx`:
  - `srcObject` set imperatively via `useRef<HTMLVideoElement>` in `useEffect`
  - Local video mirrored via `scale-x-[-1]` (Tailwind v4); `muted` set via inline ref callback (not JSX prop — React bug)
  - Camera-off fallback: avatar initials; gradient + name overlay
  - "You" badge, muted icon (destructive bg), pin/unpin button on group-hover
- [x] Bug fixes: `getUserMedia` errors logged; Vite proxy `ECONNABORTED` suppressed via custom logger

---

### Step 19 — Meeting Controls Toolbar ✅
- [x] `components/meeting/Controls.tsx` — three-zone fixed bottom bar:
  - Left spacer (reserved for future: reactions, timer)
  - Center: mic toggle (red when muted), camera toggle (red when off), screen share toggle (blue when sharing), Leave button
  - Right: chat panel toggle + participants panel toggle (ghost → neutral when panel open)
  - Unread message badge on chat button (blue dot, `9+` cap) when panel is closed
- [x] `components/meeting/ParticipantsPanel.tsx` — fixed 288px right side panel:
  - Driven by `participantsSlice.isOpen` / `togglePanel`
  - Shows each participant: avatar initials, name, host badge, mic + camera status icons (destructive when off)
- [x] `store/slices/participantsSlice.ts` — `togglePanel` + `updateParticipant` already in place
- [x] `hooks/useWebRTC.ts` — `localStream` effect auto-replaces video track on all active peers (screen share propagation)

---

### Step 20 — Chat Panel ✅
- [x] `hooks/useChat.ts`:
  - Loads message history via `GET /api/rooms/:roomId/messages` on mount (once roomId is available)
  - Listens for `NEW_MESSAGE`, `USER_TYPING`, `USER_STOP_TYPING` socket events → Redux chatSlice
  - `sendMessage(content)` — emits `SEND_MESSAGE`; clears typing state
  - `setTyping(bool)` — emits `TYPING` on first keystroke, resets 2s auto-stop timer on each keystroke, emits `STOP_TYPING` when called with false or timer fires
- [x] `components/chat/MessageBubble.tsx`:
  - Own messages: blue bubble, right-aligned via `ml-auto max-w-[85%]`
  - Others: zinc bubble, left-aligned with avatar initials + sender name above
  - `whitespace-pre-wrap wrap-break-word` — preserves Shift+Enter newlines, breaks long words
- [x] `components/chat/ChatInput.tsx`:
  - Textarea; Enter sends, Shift+Enter inserts newline
  - Fires `onTyping(true/false)` on value change; clears on send
- [x] `components/chat/ChatPanel.tsx`:
  - Driven by `chatSlice.isOpen` / `toggleChat`
  - Auto-scrolls to bottom on new messages; clears unread count on open
  - Typing indicator label above input ("X is typing…" / "N people are typing…")
- [x] `pages/Meeting/MeetingRoomPage.tsx` updated:
  - `roomId` state set after room fetch, passed to `useChat` for history load
  - `resetChat()` dispatched on unmount
  - `<ChatPanel>` and `<ParticipantsPanel>` render side-by-side in the flex main area

---

### Step 21 — Host Controls & Raise Hand ✅
- [x] `components/meeting/ParticipantsPanel.tsx` — extend existing panel:
  - Raised hand indicator per participant (hand icon, sorted to top of list)
  - Host-only three-dot menu per participant:
    - Mute / Unmute microphone — context-sensitive label based on `isAudioEnabled` state
    - Disable / Enable camera — context-sensitive label based on `isVideoEnabled` state
    - Make host — emit `transfer-host { targetUserId }`
    - Remove from meeting — emit `remove-participant { targetUserId }`, target navigates away
- [x] Backend socket handlers for host controls (`room.handler.ts`):
  - `mute-participant` / `unmute-participant` — verify host, emit `you-were-muted` / `you-were-unmuted` to target + `participant-state-updated` broadcast to room
  - `disable-participant-video` / `enable-participant-video` — verify host, emit direct event to target + room broadcast
  - `remove-participant` — verify host, emit `you-were-removed` to target (client navigates away)
  - `transfer-host` — verify host, update in-memory map + emit `host-changed` to room
  - `roomHostUserIds` map tracks current host per room; updated on transfer; seeded from DB on first join
- [x] `raise-hand` / `lower-hand` socket events:
  - Controls toolbar raise hand button (BsHandIndex/Fill, blue when raised)
  - Backend broadcasts `hand-raised { userId }` / `hand-lowered { userId }` to room
  - `participantsSlice.updateParticipant` sets `isHandRaised`; panel sorts raised-hand users to top
  - Yellow hand badge on `VideoTile` (stacked below muted indicator)
- [x] `meetingSlice`: added `hostId`, `setHost`, `setMuted`, `setCameraOff`; `participantsSlice`: added `transferHost`
- [x] `useMedia`: added `muteAudio`, `unmuteAudio`, `disableVideo`, `enableVideo`
- [x] `PARTICIPANT_STATE_UPDATED` broadcast keeps every participant's mic/video status live in the panel for all room members

**Bug fixes applied post-Step 21:**
- Camera/mic indicator stays on after leaving: `VideoTile` useEffect now clears `video.srcObject = null` in cleanup; `LobbyPage` also clears `videoRef.current.srcObject = null` before stopping tracks. Root cause: browsers hold hardware open as long as any `<video>` has `srcObject` set, even after `track.stop()`.
- React StrictMode double-mount leak: `useMedia` now uses a `cancelled` flag; `LobbyPage` uses a `mountedRef`. If `getUserMedia` resolves after cleanup, the stream is stopped immediately on arrival.
- Tailwind v4 rename: `bg-gradient-to-t` → `bg-linear-to-t` applied in VideoTile.

---

## Phase 6 — Advanced Features

### Step 22 — Screen Sharing (complete) ✅
- [x] Screen share toggle in Controls.tsx (blue highlight when active)
- [x] `useMedia.startScreenShare()` — `getDisplayMedia`, auto-reverts on browser stop button
- [x] `useWebRTC` — `localStream` effect replaces video track on all peers automatically
- [x] Emit `screen-share-started { userId }` / `screen-share-stopped { userId }` socket events
- [x] Backend broadcasts to room; frontend updates `participantsSlice.isScreenSharing`
- [x] `VideoGrid` auto-pins the screen-sharing tile into spotlight layout

---

### Step 23 — Reactions ✅
- [x] `components/meeting/ReactionPicker.tsx` — emoji grid popup (8 emojis: 👍❤️😂😮😢🎉👏🔥) in toolbar
- [x] On reaction selected: emit `reaction { emoji }` socket event; backend broadcasts `reaction { emoji, userId }` to room
- [x] `components/meeting/ReactionOverlay.tsx` — floating emoji animations per `VideoTile` (CSS keyframe float-up, fade-out after 3s; pseudo-random X offset per reaction id)

**Bug fix:** ReactionPicker popup positioning — `bottom-full mb-2` replaces `bottom-14`; `w-max` prevents grid from being squashed to button width; `text-2xl leading-none` on emoji buttons; click-outside handler added.

---

### Step 24 — Meet Invitations & Share ✅
- [x] `InviteDialog.tsx` — two-tab dialog:
  - "Copy link" tab (all users): read-only link input + Copy button
  - "Email invite" tab (host only): chip input (Enter/comma/Tab to commit, Backspace removes last, onBlur commits pending); calls `POST /api/invitations` with `sendEmail: true`; real emails sent only when `SMTP_HOST` is configured in backend `.env`
- [x] `pages/Invite/InviteLandingPage.tsx` — `/invite/:token`:
  - Waits for both auth check and invitation fetch before rendering
  - Shows inviter name + room name + "Join meeting" CTA (authenticated) or Sign in / Create account buttons (unauthenticated)
  - Expired/used/invalid token → error card with "Go to dashboard" link
- [x] `ParticipantsPanel.tsx` — `BsPersonPlus` invite button in panel header opens `InviteDialog`; accepts `roomId`/`roomCode` props (passed from `MeetingRoomPage`)
- [x] `DashboardPage.tsx` — "Invite people" dropdown item opens `InviteDialog` for that room
- [x] `LoginPage` + `RegisterPage` — `useSearchParams` reads `?redirect=` and navigates there after successful auth (enables invite deep-link flow)
- [x] `types/index.ts` — added `inviter?: Pick<User, 'id' | 'name' | 'avatar'>` to `Invitation`

---

### Step 25 — Settings & Device Management ✅
- [x] `SettingsModal.tsx` — Dialog with 4 sections: Camera (select + live mirrored preview), Microphone (select), Speaker (select; shows "not supported" note if browser lacks `setSinkId`), Layout (Grid / Spotlight / Sidebar-disabled buttons; persisted to `localStorage`)
- [x] `useMedia.ts` — added `devices` (enumerateDevices after getUserMedia), `activeVideoId/AudioId` (from track.getSettings()), `cameraStream` state (always camera, not screen), `switchCamera(deviceId)` / `switchMicrophone(deviceId)` (rebuild MediaStream, preserve enabled state, update refs + state)
- [x] `useWebRTC.ts` — localStream effect now replaces both video and audio senders on all peers (covers mic switch, camera switch, screen share start/stop)
- [x] `uiSlice.ts` — added `audioOutputId` + `setAudioOutput`; `meetingLayout` now reads from `localStorage` on init and persists on `setMeetingLayout`; exported `MeetingLayout` type
- [x] `Controls.tsx` — gear `BsGear` button in right panel zone dispatches `toggleSettings()`
- [x] `VideoTile.tsx` — added `audioOutputId` prop; `setSinkId` called in `useEffect` with feature-detect guard for non-local tiles
- [x] `VideoGrid.tsx` — reads `meetingLayout` + `audioOutputId` from Redux; `manualPinnedId` starts `undefined`; when layout is `'spotlight'` and no manual choice, auto-pins first remote tile; passes `audioOutputId` to all non-local tiles
- [x] `MeetingRoomPage.tsx` — destructures `cameraStream`, `devices`, `activeVideoId/AudioId`, `switchCamera/Microphone` from `useMedia`; renders `<SettingsModal>`

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
| 19 | Meeting Controls Toolbar ✅ | Meeting Room |
| 20 | Chat Panel ✅ | Meeting Room |
| 21 | Host Controls & Raise Hand | Meeting Room |
| 22 | Screen Sharing (complete) | Advanced |
| 23 | Reactions | Advanced |
| 24 | Meet Invitations & Share ✅ | Advanced |
| 25 | Settings & Device Management ✅ | Advanced |
| 26 | Recording | Advanced |
| 27 | Notifications & UX Polish | Polish |
| 28 | Security & Production Hardening | Polish |
| 29 | Production Docker Build | Polish |
| 30 | React Native Mobile App | Future |
| 31 | Electron Desktop App | Future |
