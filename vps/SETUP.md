# Vōx — Production Deployment Guide
# Local Ubuntu Server + VPS WireGuard Tunnel

## Architecture

```
Internet
  │
  ▼
VPS (public IP 162.245.191.102, domain vox.sleecetechnologies.com.ng)
  ├── Nginx :80/:443  ──WireGuard 10.10.0.1→10.10.0.10──►  Local Ubuntu :80
  │                                                            └── Docker (frontend + backend + db)
  └── coturn :3478 (native install on VPS, direct UDP to clients)
```

> **WireGuard subnet used:** `10.10.0.0/24`  
> VPS hub = `10.10.0.1`, local machine = `10.10.0.10`

---

## Prerequisites

| Machine      | What you need                                   |
|--------------|-------------------------------------------------|
| VPS          | Ubuntu 22.04+, public IP, SSH access            |
| Local Ubuntu | Ubuntu 22.04+, Docker installed                 |
| Domain       | A record → VPS public IP                        |

---

## Step 1 — DNS

In your domain registrar, add an A record pointing to the VPS public IP.
Check propagation before running certbot:
```bash
dig +short vox.sleecetechnologies.com.ng
```

---

## Step 2 — VPS: WireGuard (if not already configured)

> **Note:** If WireGuard is already running on the VPS with existing peers, just ADD a new `[Peer]` block for the local machine — do **not** recreate the server config.

```bash
# On VPS — show current config
sudo wg show
sudo cat /etc/wireguard/wg0.conf

# Add peer for local machine (replace with actual public key)
sudo wg set wg0 peer <LOCAL_MACHINE_PUBLIC_KEY> \
  allowed-ips 10.10.0.10/32 \
  persistent-keepalive 25

# Save to config file
sudo wg-quick save wg0
```

On local Ubuntu:
```bash
sudo apt install -y wireguard

# Generate local keys
wg genkey | sudo tee /etc/wireguard/local_private.key \
          | wg pubkey | sudo tee /etc/wireguard/local_public.key
sudo chmod 600 /etc/wireguard/local_private.key

sudo cat /etc/wireguard/local_public.key   # → give this to VPS
```

Copy `vps/wireguard/wg0-client.conf` to `/etc/wireguard/wg0.conf` on local machine.
Fill in `<LOCAL_MACHINE_PRIVATE_KEY>` from the file above.

```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0

# Test
ping 10.10.0.1   # from local → VPS should reply
```

---

## Step 3 — VPS: Nginx + SSL

> **nginx version note:** Ubuntu 22.04 ships nginx 1.24.0 which does NOT support `http2 on;`  
> Always use `listen 443 ssl http2;` syntax.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# If other configs exist, check for conflicts first
ls /etc/nginx/sites-enabled/

# Rewrite main nginx.conf to a clean slate if it has hardcoded server blocks:
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# Deploy vox config
sudo cp /path/to/repo/vps/nginx.conf /etc/nginx/sites-available/vox
sudo ln -s /etc/nginx/sites-available/vox /etc/nginx/sites-enabled/vox
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx

# Issue SSL cert (use --nginx authenticator, NOT --webroot)
sudo certbot --nginx -d vox.sleecetechnologies.com.ng

# Auto-renew
sudo systemctl enable --now certbot.timer
```

---

## Step 4 — VPS: coturn

```bash
sudo apt install -y coturn

# Enable daemon
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Create log dir
sudo mkdir -p /var/log/turnserver

# Deploy config
sudo cp /path/to/repo/vps/coturn/turnserver.conf /etc/turnserver.conf

sudo systemctl enable --now coturn
sudo ss -ulnp | grep 3478   # verify listening
```

---

## Step 5 — VPS: Firewall

```bash
sudo ufw allow 22/tcp           # SSH
sudo ufw allow 80/tcp           # HTTP (certbot + redirect)
sudo ufw allow 443/tcp          # HTTPS
sudo ufw allow 51820/udp        # WireGuard
sudo ufw allow 3478/tcp         # TURN/STUN
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp         # TURNS (TLS)
sudo ufw allow 49152:65535/udp  # TURN relay range
sudo ufw enable
```

---

## Step 6 — Local Ubuntu: Deploy the app

```bash
# Install Docker
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in

# Clone the repo
git clone https://github.com/victor-levus/vox ~/video-call
cd ~/video-call
```

Edit `.env` with production values:
```env
# MySQL
MYSQL_ROOT_PASSWORD=<strong-root-password>
MYSQL_DATABASE=videocall
MYSQL_USER=<db-user>
MYSQL_PASSWORD=<strong-db-password>

# IMPORTANT: allowPublicKeyRetrieval=true is required for MySQL 8 + Prisma auth plugin
DATABASE_URL=mysql://<db-user>:<db-password>@db:3306/videocall?allowPublicKeyRetrieval=true

# Session
SESSION_SECRET=<32+ random chars>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
SESSION_MAX_AGE_MS=604800000

# Server
PORT=4000
NODE_ENV=production
CLIENT_URL="https://vox.sleecetechnologies.com.ng"

# TURN server (on VPS)
VITE_STUN_URL="stun:stun.l.google.com:19302"
VITE_TURN_URL="turn:vox.sleecetechnologies.com.ng:3478"
VITE_TURN_USERNAME=vox
VITE_TURN_CREDENTIAL=<TURN_PASSWORD>
```

**Start the app (skip the local coturn container — coturn is on VPS):**
```bash
docker compose -f docker-compose.prod.yml up -d --build --scale coturn=0
```

Run Prisma migrations:
```bash
docker exec videocall_backend npx prisma migrate deploy
```

> **Note:** If `migrate deploy` says "schema not found", the prisma folder is inside the container at `/app/prisma` — the command above should work since the Dockerfile copies it there. If it still fails, cp manually:
> ```bash
> docker cp ~/video-call/backend/prisma videocall_backend:/app/
> docker cp ~/video-call/backend/prisma.config.ts videocall_backend:/app/
> docker exec videocall_backend npx prisma migrate deploy
> ```

---

## Step 7 — Verify

| Check                                           | Expected                         |
|-------------------------------------------------|----------------------------------|
| `https://vox.sleecetechnologies.com.ng`         | Vōx login page loads             |
| `https://vox.sleecetechnologies.com.ng/api/health` | `{"status":"ok"}`             |
| Browser DevTools → Application → Cookies        | `connect.sid` present after login |
| Browser DevTools → Network → WS                 | Socket.io connection established |
| `sudo wg show` on VPS                           | Shows local peer with recent handshake |

---

## Updating the app after code changes

```bash
# On local Ubuntu
cd ~/video-call
git pull
docker compose -f docker-compose.prod.yml up -d --build --scale coturn=0
```

---

## Troubleshooting

**Session cookie not set after login (browser Application tab shows no cookies):**
- Root cause: `express-session` won't set a `Secure` cookie unless `X-Forwarded-Proto: https` reaches the backend
- The Docker frontend nginx MUST hardcode `proxy_set_header X-Forwarded-Proto https;` for both `/api/` and `/socket.io/` locations
- After changing `frontend/nginx.conf`, rebuild the frontend container: `docker compose -f docker-compose.prod.yml up -d --build frontend`

**WireGuard not connecting:**
- Check VPS firewall allows UDP 51820: `sudo ufw status`
- Both sides must have the other's public key set correctly
- `sudo wg show` on both machines shows connection state

**Nginx 502 Bad Gateway:**
- Docker app isn't reachable at `http://10.10.0.10`
- Verify: `curl http://10.10.0.10` from VPS (should return HTML)
- Check Docker is running: `docker ps` on local machine

**MySQL RSA public key error (Prisma can't connect to DB):**
- Add `?allowPublicKeyRetrieval=true` to `DATABASE_URL` in `.env` and `docker-compose.prod.yml`

**nginx error: `http2 on` unknown directive:**
- Your nginx is 1.24.0 or older — use `listen 443 ssl http2;` instead of `http2 on;`
- `sed -i 's/listen 443 ssl;/listen 443 ssl http2;/' /etc/nginx/sites-available/vox`

**certbot 404 with --webroot:**
- Use `certbot --nginx` (auto-configures nginx challenge) instead of `--webroot`

**No relay ICE candidates (TURN not working):**
- Check coturn is running: `sudo systemctl status coturn`
- Check UDP 3478 is open in ufw
- Test: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
