# Vōx — Production Deployment Guide
# Local Ubuntu Server + VPS WireGuard Tunnel

## Architecture

```
Internet
  │
  ▼
VPS (public IP + domain)
  ├── Nginx :80/:443  ──WireGuard 10.0.0.1→10.0.0.2──►  Local Ubuntu :80
  │                                                         └── Docker (frontend + backend + db)
  └── coturn :3478/:5349  (native install on VPS, direct UDP)
```

## Prerequisites

| Machine      | What you need                                   |
|--------------|-------------------------------------------------|
| VPS          | Ubuntu 22.04+, public IP, SSH access            |
| Local Ubuntu | Ubuntu 22.04+, Docker installed                 |
| Domain       | A record → VPS public IP (both `@` and `www`)   |

---

## Step 1 — DNS

In your domain registrar, add:

```
@    A   <VPS_PUBLIC_IP>
www  A   <VPS_PUBLIC_IP>
```

Check propagation before running certbot:
```bash
dig +short yourdomain.com
```

---

## Step 2 — VPS: WireGuard setup

SSH into your VPS:

```bash
sudo apt update && sudo apt install -y wireguard

# Generate VPS WireGuard keys
wg genkey | sudo tee /etc/wireguard/server_private.key \
          | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key

# Print both — you'll need these values
sudo cat /etc/wireguard/server_private.key   # → VPS_PRIVATE_KEY
sudo cat /etc/wireguard/server_public.key    # → VPS_PUBLIC_KEY (give to local machine)

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Find your network interface name (note it — probably eth0, ens3, ens160)
ip route | grep default
```

Copy `vps/wireguard/wg0-server.conf` to `/etc/wireguard/wg0.conf` on the VPS.
Fill in the placeholders (come back to fill `<LOCAL_MACHINE_PUBLIC_KEY>` after Step 4):

```
<VPS_PRIVATE_KEY>           → contents of /etc/wireguard/server_private.key
<LOCAL_MACHINE_PUBLIC_KEY>  → generated in Step 4 (fill in after)
eth0 in PostUp/PostDown     → your actual interface name from above
```

---

## Step 3 — VPS: Nginx + SSL

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Certbot webroot directory
sudo mkdir -p /var/www/certbot

# Deploy config (replace yourdomain.com with your actual domain)
sudo cp /path/to/repo/vps/nginx.conf /etc/nginx/sites-available/vox
sudo sed -i 's/<YOUR_DOMAIN>/yourdomain.com/g' /etc/nginx/sites-available/vox
sudo ln -s /etc/nginx/sites-available/vox /etc/nginx/sites-enabled/vox
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx

# Issue SSL cert — DNS must already point to this VPS
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew
sudo systemctl enable --now certbot.timer
```

---

## Step 4 — VPS: coturn

```bash
sudo apt install -y coturn

# Enable daemon start
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Create log dir
sudo mkdir -p /var/log/turnserver

# Deploy config
sudo cp /path/to/repo/vps/coturn/turnserver.conf /etc/turnserver.conf
```

Edit `/etc/turnserver.conf` — replace all placeholders:
```
<VPS_PUBLIC_IP>   → your VPS IP address
<YOUR_DOMAIN>     → your domain
<TURN_PASSWORD>   → a strong random password (keep this — goes into .env too)
```

Optionally uncomment the TLS cert lines after certbot ran.

```bash
sudo systemctl enable --now coturn

# Verify it's listening
sudo ss -ulnp | grep 3478
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

## Step 6 — Local Ubuntu: WireGuard setup

SSH into your local Ubuntu server:

```bash
sudo apt update && sudo apt install -y wireguard

# Generate local machine keys
wg genkey | sudo tee /etc/wireguard/local_private.key \
          | wg pubkey | sudo tee /etc/wireguard/local_public.key
sudo chmod 600 /etc/wireguard/local_private.key

# Print public key — copy this to the VPS wg0.conf [Peer] section
sudo cat /etc/wireguard/local_public.key
```

Copy `vps/wireguard/wg0-client.conf` to `/etc/wireguard/wg0.conf` on the local machine.
Fill in:
```
<LOCAL_MACHINE_PRIVATE_KEY>  → contents of /etc/wireguard/local_private.key
<VPS_PUBLIC_KEY>             → contents of /etc/wireguard/server_public.key (from VPS)
<VPS_PUBLIC_IP>              → your VPS IP address
```

---

## Step 7 — Exchange keys & start WireGuard

**On VPS** — fill in the local machine's public key you got in Step 6:
```bash
sudo nano /etc/wireguard/wg0.conf
# Replace <LOCAL_MACHINE_PUBLIC_KEY> with the key from Step 6
```

**Start WireGuard on both machines:**
```bash
# On VPS
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0

# On local machine
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

**Test the tunnel:**
```bash
# From VPS — should get replies from local machine
ping 10.0.0.2

# From local machine — should get replies from VPS
ping 10.0.0.1
```

---

## Step 8 — Local Ubuntu: Deploy the app

```bash
# Install Docker if not already installed
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in for group to take effect

# Clone the repo
git clone <your-repo-url> ~/video-call
cd ~/video-call
```

Edit `.env` with production values:
```env
# MySQL
MYSQL_ROOT_PASSWORD=<strong-root-password>
MYSQL_DATABASE=videocall
MYSQL_USER=victorlevus
MYSQL_PASSWORD=<strong-db-password>

# Session
SESSION_SECRET=<32+ random chars>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
SESSION_MAX_AGE_MS=604800000

# Server
PORT=4000
NODE_ENV=production
CLIENT_URL="https://yourdomain.com,https://www.yourdomain.com"

# TURN server (on VPS)
VITE_STUN_URL="stun:stun.l.google.com:19302"
VITE_TURN_URL="turn:yourdomain.com:3478"
VITE_TURN_USERNAME=vox
VITE_TURN_CREDENTIAL=<TURN_PASSWORD>     # same password set in turnserver.conf
```

**Start the app (skip the local coturn container — coturn is on VPS):**
```bash
docker compose -f docker-compose.prod.yml up -d --build \
  --scale coturn=0
```

Run Prisma migrations:
```bash
docker exec videocall_backend npx prisma migrate deploy
```

---

## Step 9 — Verify

| Check                                     | Expected                              |
|-------------------------------------------|---------------------------------------|
| `https://yourdomain.com`                  | Vōx login page loads                  |
| `https://yourdomain.com/api/health`       | `{"status":"ok"}`                     |
| Browser DevTools → Network → WS           | Socket.io connection established      |
| Create meeting → open DevTools console   | ICE candidate with `typ relay` present |
| `sudo wg show` on VPS                     | Shows local peer with recent handshake |

---

## Troubleshooting

**WireGuard not connecting:**
- Check VPS firewall allows UDP 51820: `sudo ufw status`
- Both sides must have the other's public key set correctly
- `sudo wg show` on both machines shows connection state

**Nginx 502 Bad Gateway:**
- The local machine's Docker app isn't reachable at 10.0.0.2:80
- Verify: `curl http://10.0.0.2` from VPS (should return HTML)
- Check Docker is running: `docker ps` on local machine

**No relay ICE candidates (TURN not working):**
- Check coturn is running: `sudo systemctl status coturn`
- Check UDP 3478 is open in ufw
- Test TURN credentials with a tool like https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

**SSL cert not issuing:**
- DNS must propagate first: `dig +short yourdomain.com` must return the VPS IP
- Port 80 must be open and Nginx must be serving the ACME challenge
