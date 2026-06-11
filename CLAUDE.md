# VideoCall App — CLAUDE.md

## Project Overview

A full-featured video calling web application (like Google Meet / Microsoft Teams) built with a WebSocket + WebRTC architecture. The web app is Phase 1; Phase 2 will be a React Native mobile app and Phase 3 an Electron desktop app sharing the same backend.

---

## Tech Stack

### Frontend
- **React 18 + Vite + TypeScript**
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite` Vite plugin (NOT PostCSS plugin)
- **shadcn/ui** (built on Radix UI) — accessible component primitives
- **react-icons** — icon library
- **Redux Toolkit** — global state management
- **Socket.io-client** — WebSocket real-time communication
- **Native WebRTC API** — peer-to-peer video/audio (no simple-peer)

### Backend
- **Node.js + Express + TypeScript**
- **Prisma ORM + MySQL** — database layer
- **Socket.io** — WebSocket server (signaling + chat + room events)
- **express-session** — stateful session middleware (session stored in DB)
- **connect-prisma-session / custom Prisma session store** — persists sessions to the `Session` table via Prisma
- **Zod** — schema declaration and request validation; each module owns its schemas in `xxx.schema.ts`
- **bcryptjs** — password hashing
- **nodemailer** — email invitations

> **Auth approach:** Sessions are server-side and stored in MySQL. The client holds only an HTTP-only `connect.sid` cookie (no tokens in `localStorage`). Every request is validated against the `Session` table. Sessions can be invalidated server-side at any time (logout, force-expire, admin revoke). Socket.io authenticates by reading the same session cookie on the handshake.

### Infrastructure
- **Docker + Docker Compose** — containerization
  - `frontend` container (Nginx serving Vite build)
  - `backend` container (Node.js)
  - `db` container (MySQL 8)
  - `coturn` container (TURN/STUN server for WebRTC NAT traversal)

---

## Repository Structure

```
video-call/
├── CLAUDE.md
├── docker-compose.yml
├── .env.example
│
├── frontend/
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json          # shadcn config
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ui/              # shadcn generated components
│       │   ├── layout/          # AppLayout, Sidebar, Header
│       │   ├── auth/            # LoginForm, RegisterForm
│       │   ├── meeting/         # VideoGrid, VideoTile, Controls, Toolbar
│       │   ├── chat/            # ChatPanel, MessageBubble, ChatInput
│       │   └── shared/          # Avatar, LoadingSpinner, Modal
│       ├── pages/
│       │   ├── Auth/            # LoginPage, RegisterPage
│       │   ├── Dashboard/       # HomePage, recent meetings
│       │   ├── Meeting/         # MeetingRoom (main room page)
│       │   ├── Lobby/           # pre-join lobby / waiting room
│       │   └── Invite/          # Accept invite landing page
│       ├── store/
│       │   ├── index.ts
│       │   └── slices/
│       │       ├── authSlice.ts
│       │       ├── meetingSlice.ts
│       │       ├── chatSlice.ts
│       │       ├── participantsSlice.ts
│       │       └── uiSlice.ts
│       ├── hooks/
│       │   ├── useWebRTC.ts
│       │   ├── useSocket.ts
│       │   ├── useMedia.ts
│       │   └── useChat.ts
│       ├── services/
│       │   ├── api.ts           # axios instance + interceptors
│       │   ├── auth.service.ts
│       │   ├── meeting.service.ts
│       │   └── socket.service.ts
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           └── index.ts
│
└── backend/
    ├── Dockerfile
    ├── tsconfig.json
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── server.ts            # HTTP + Socket.io bootstrap
        ├── app.ts               # Express app + middleware
        ├── config/
        │   ├── env.ts
        │   └── prisma.ts
        ├── middleware/
        │   ├── auth.middleware.ts
        │   └── error.middleware.ts
        ├── modules/
        │   ├── auth/
        │   │   ├── auth.routes.ts
        │   │   ├── auth.schema.ts
        │   │   └── auth.service.ts
        │   ├── users/
        │   │   ├── users.routes.ts
        │   │   ├── users.schema.ts
        │   │   └── users.service.ts
        │   ├── rooms/
        │   │   ├── rooms.routes.ts
        │   │   ├── rooms.schema.ts
        │   │   └── rooms.service.ts
        │   ├── messages/
        │   │   ├── messages.routes.ts
        │   │   ├── messages.schema.ts
        │   │   └── messages.service.ts
        │   └── invitations/
        │       ├── invitations.routes.ts
        │       ├── invitations.schema.ts
        │       └── invitations.service.ts
        └── websocket/
            ├── socket.ts        # Socket.io server init + namespace
            └── handlers/
                ├── signaling.handler.ts   # WebRTC offer/answer/ICE
                ├── room.handler.ts        # join/leave/participant events
                └── chat.handler.ts        # real-time messages
```

---

## Database Schema (Prisma)

**Models:**
- `User` — id, name, email, password (hashed), avatar, createdAt
- `Session` — id (session ID string), userId, data (JSON blob), expiresAt, createdAt, updatedAt
- `Room` — id, code (unique 10-char), name, hostId, isActive, createdAt
- `Participant` — id, userId, roomId, joinedAt, leftAt, role (host/guest)
- `Message` — id, roomId, senderId, content, type (text/file), createdAt
- `Invitation` — id, roomId, invitedEmail, token (unique), expiresAt, accepted

**Session table notes:**
- `id` is the raw session ID (set by `express-session`, stored in the client cookie)
- `data` stores the serialised session payload (userId, etc.) as a JSON string
- A cron job or middleware prunes expired rows (`expiresAt < NOW()`) to keep the table lean
- `userId` is indexed for fast "get all sessions for user" queries (used by force-logout)

---

## WebRTC + WebSocket Architecture

```
Client A                WebSocket Server              Client B
   |                         |                           |
   |-- join-room ----------->|                           |
   |                         |<---------- join-room ------| 
   |<-- user-joined ---------|                           |
   |-- offer (SDP) --------->|-- forward offer --------->|
   |                         |<-- answer (SDP) -----------|
   |<-- answer --------------|                           |
   |-- ice-candidate ------->|-- forward ice ----------->|
   |<-- ice-candidate -------|<-- ice-candidate ----------|
   |========= P2P WebRTC stream established ============ |
```

For conferencing (3+ users), a **mesh topology** is used for MVP — each peer connects to every other peer. SFU (Selective Forwarding Unit) can be introduced in a later phase for scalability.

---

## Key Environment Variables

```env
# Backend
DATABASE_URL="mysql://user:password@db:3306/videocall"
SESSION_SECRET="long-random-string-min-32-chars"
SESSION_MAX_AGE_MS=604800000          # 7 days in milliseconds
SESSION_COOKIE_SECURE=false           # true in production (HTTPS only)
SESSION_COOKIE_SAME_SITE=lax          # lax | strict | none
PORT=4000
CLIENT_URL="http://localhost:5173"    # comma-separate to allow multiple origins e.g. ngrok
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Frontend
VITE_API_URL="/api"                   # relative — routes through Vite proxy; never use absolute URL
VITE_SOCKET_URL=""                    # empty = socket.io connects to current page origin via proxy
VITE_STUN_URL="stun:stun.l.google.com:19302"
VITE_TURN_URL="turn:localhost:3478"
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

---

## Development Commands

```bash
# Start all services
docker-compose up --build

# Backend only (dev)
cd backend && npm run dev

# Frontend only (dev)
cd frontend && npm run dev

# Prisma migrations
cd backend && npx prisma migrate dev --name <name>

# Prisma studio
cd backend && npx prisma studio
```

---

## Coding Conventions

- Module folder structure: `xxx.routes.ts` + `xxx.schema.ts` + `xxx.service.ts` (no controller layer)
- Routes file is the thin HTTP layer: parse `req`, call service, send `res` — inline, no separate controller file
- Schema file owns all Zod schemas and inferred TypeScript types for that module (request bodies, params, query strings)
- Service file owns all business logic: DB queries, session checks, transformations
- A shared `validate` middleware reads a Zod schema and calls `next()` or returns 400 with formatted errors — routes pass the schema, never call `.parse()` themselves
- All async route handlers wrapped with an `asyncHandler` utility (no try/catch repetition)
- Frontend API calls go through `services/api.ts` (axios instance with `withCredentials: true` — no tokens in headers)
- Auth check: `req.session.userId` is the source of truth on every protected route
- Socket.io auth: session cookie parsed on handshake via `cookie-parser` + session store lookup
- Socket events defined as constants in a shared `events.ts` file
- No `any` types — strict TypeScript throughout
- Tailwind only — no inline styles, no CSS modules

---

## Version Gotchas (learned during build)

### Prisma 7.x
- `url` is **NOT** in `schema.prisma` datasource block — put it in `prisma.config.ts` via `defineConfig({ datasource: { url: env('DATABASE_URL') } })`
- `PrismaClient` requires a driver adapter — use `@prisma/adapter-mariadb` for MySQL; pass it as `new PrismaClient({ adapter })`
- Never use `node:` protocol imports (e.g. `node:path`) — use plain `path`, `fs` etc. — `node:` requires `moduleResolution: node16` which conflicts with `commonjs`
- Backend `tsconfig.json` must include `"types": ["node"]` explicitly

### Tailwind CSS v4.x
- PostCSS plugin moved to `@tailwindcss/postcss` — but for Vite projects use `@tailwindcss/vite` plugin instead
- `vite.config.ts`: `plugins: [react(), tailwindcss()]` (import from `@tailwindcss/vite`)
- `postcss.config.js`: only `autoprefixer` — remove `tailwindcss` entry
- `src/index.css`: replace `@tailwind base/components/utilities` with `@import "tailwindcss"`
- Load animate plugin via CSS: `@plugin "tailwindcss-animate"` — remove from `tailwind.config.ts` plugins array
- Load JS config via CSS: `@config "../tailwind.config.ts"`
- **Renamed utility classes** (v3 → v4): `break-words` → `wrap-break-word`, `transform-[scaleX(-1)]` → `scale-x-[-1]`; IDE lints these as `suggestCanonicalClasses`

### Vite dev server — ngrok / external host access
- Vite 5.4+ rejects requests whose `Host` header isn't `localhost` (DNS rebinding protection) — results in `403 Forbidden` through ngrok
- Fix: add `server.allowedHosts: ['<ngrok-subdomain>.ngrok-free.dev']` in `vite.config.ts`
- Always use **relative** `VITE_API_URL="/api"` and empty `VITE_SOCKET_URL=""` so requests route through the Vite proxy regardless of origin; never hardcode an absolute ngrok URL

### CORS — multiple allowed origins
- `CLIENT_URL` in `backend/.env` supports comma-separated origins: `"http://localhost:5173,https://<ngrok-url>"`
- `app.ts` and `websocket/socket.ts` parse it: `config.CLIENT_URL.split(',').map(o => o.trim())`
- Socket.io-client: use `io(import.meta.env.VITE_SOCKET_URL || undefined)` — passing `undefined` connects to the current page origin; `''` is unreliable

### Self-initiated media state changes — broadcast pattern
When a user toggles their own mic/camera, emit `MEDIA_STATE_CHANGED` (client → server); the server handler rebroadcasts `PARTICIPANT_STATE_UPDATED` to the room — the same event host-control actions use. This keeps every client's `participantsSlice` (VideoTile mute icons + ParticipantsPanel) in sync without a separate code path.
- Emit `{ isAudioEnabled: !current }` / `{ isVideoEnabled: !current }` — just the changed field.
- Also emit once inside `onParticipantList` (fired after the server confirms join) if the user entered with mic/camera off, so other participants see the correct initial state.

### Passing pre-join lobby state to the meeting room
The lobby (`LobbyPage`) and the meeting room (`MeetingRoomPage`) are separate routes with separate media streams. Lobby state is **not** shared via Redux — use React Router navigation state:
```ts
// LobbyPage — on "Join now"
navigate(`/room/${code}`, { state: { isMuted, isCameraOff } });

// MeetingRoomPage
const location = useLocation();
const lobbyState = location.state as { isMuted?: boolean; isCameraOff?: boolean } | null;
```
`useMedia` accepts `{ initialAudioEnabled, initialVideoEnabled }` and applies them to the stream's tracks immediately after `getUserMedia` resolves — before the stream is exposed to the component.

### Prisma filtered relation counts
Prisma 7 supports `_count` with a `where` filter — use it when you need a conditional count (e.g. active participants only):
```ts
_count: { select: { participants: { where: { leftAt: null } } } }
```
Without the filter, `_count` counts all rows ever inserted, including soft-deleted/left ones.

### Production deployment — multi-proxy session cookie (critical)
`express-session` calls an internal `issecure(req, trustProxy)` before setting a `Secure` cookie. It reads `req.headers['x-forwarded-proto']` directly — **it does NOT use Express's `trust proxy` setting**. If that header is missing or `http`, the cookie is silently never set, even though the session row exists in the DB.

In a multi-proxy chain (VPS nginx → Docker frontend nginx → backend), the Docker frontend nginx must **hardcode** the header — do NOT use `$scheme` (always `http` between containers) or `$http_x_forwarded_proto` (fragile, spacing-dependent in sed):

```nginx
# frontend/nginx.conf — /api/ and /socket.io/ locations
proxy_set_header X-Forwarded-Proto https;
```

`app.set('trust proxy', 1)` is still needed for `req.ip` / rate-limiting, but it does **not** fix the `issecure` check.

### Production deployment — MySQL 8 + Prisma auth plugin
MySQL 8 uses `caching_sha2_password` by default. Prisma's MariaDB adapter fails with an RSA public key error unless you add `?allowPublicKeyRetrieval=true` to the connection string:
```
DATABASE_URL=mysql://user:pass@db:3306/videocall?allowPublicKeyRetrieval=true
```
Add this to both `.env` and `docker-compose.prod.yml` environment block.

### Production deployment — nginx 1.24 HTTP/2 syntax
Ubuntu 22.04 ships nginx **1.24.0** which does **not** support the `http2 on;` directive (added in 1.25.1). Use the old inline syntax:
```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

### Prisma schema changes in development — regenerate the client

`prisma migrate dev` applies the SQL but **does not hot-reload the generated client** when `tsx` is running. After any schema change:
```bash
npx prisma generate   # then restart the backend
```
Without this, new fields throw `PrismaClientValidationError: Unknown argument 'fieldName'` at runtime even though `tsc` compiled cleanly (tsx strips types without re-checking the generated client).

### Production deployment — Prisma Docker build
`prisma generate` runs at Docker build time and needs `DATABASE_URL` to exist (even a fake one):
```dockerfile
RUN DATABASE_URL="mysql://x:x@localhost/x" npx prisma generate
```
The production stage also needs prisma artefacts copied from the builder:
```dockerfile
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
```

### Production deployment — TypeScript 7 `baseUrl` deprecation
`frontend/tsconfig.app.json` with `"baseUrl": "."` triggers a TypeScript 7 deprecation error during Docker build. Suppress it:
```json
"baseUrl": ".",
"ignoreDeprecations": "6.0"
```
