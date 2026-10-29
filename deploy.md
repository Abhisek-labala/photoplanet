# Comprehensive Deployment Guide: DigitalOcean Droplet & GoDaddy DNS

This guide walks you step-by-step through deploying the **PHOTO PLANET STUDIO PWA** to a **DigitalOcean Droplet** and connecting it to your subdomain **`qt.photoplanet.in`** managed on **GoDaddy**, complete with free automated **SSL (HTTPS)**.

---

## 📋 Overview of Architecture

```
[User Browser / PWA Mobile App]
                │
                ▼ (HTTPS - Port 443)
       [GoDaddy DNS: qt.photoplanet.in]
                │
                ▼ (Public IPv4)
    [DigitalOcean Droplet (Ubuntu 24.04/22.04)]
                │
         [Nginx Reverse Proxy + Let's Encrypt SSL]
                │
                ▼ (Internal HTTP - Port 3000)
       [Node.js / Express Server (Managed by PM2)]
                │
                ├──── Serves Frontend PWA Static Files (`frontend/dist`)
                │
                ▼ (Port 5432)
      [PostgreSQL Database (`photoplanet`)]
```

---

## 🗂️ Table of Contents
1. [Step 1: Point Subdomain on GoDaddy](#satep-1-point-subdomain-on-godaddy)
2. [Step 2: Create DigitalOcean Droplet](#step-2-create-digitalocean-droplet)
3. [Step 3: Initial Server Setup & Swap Memory](#step-3-initial-server-setup--swap-memory)
4. [Step 4: Install Required Packages (Node.js, PostgreSQL, Nginx)](#step-4-install-required-packages)
5. [Step 5: Setup PostgreSQL Database](#step-5-setup-postgresql-database)
6. [Step 6: Deploy Code & Build Application](#step-6-deploy-code--build-application)
7. [Step 7: Configure PM2 Process Manager](#step-7-configure-pm2-process-manager)
8. [Step 8: Configure Nginx Reverse Proxy](#step-8-configure-nginx-reverse-proxy)
9. [Step 9: Install Free SSL Certificate (HTTPS)](#step-9-install-free-ssl-certificate-https)
10. [Step 10: Verify & Test PWA Installation](#step-10-verify--test-pwa-installation)
11. [Troubleshooting & 1-Click Update Script](#troubleshooting--1-click-update-script)

---

## Step 1: Create DigitalOcean Droplet

1. Log into your **DigitalOcean Cloud Console** ([cloud.digitalocean.com](https://cloud.digitalocean.com/)).
2. Click **Create** (top right) ➔ **Droplets**.
3. Choose your configuration:
   - **Region**: Select **Bangalore (BLR1)** (recommended for lowest latency in India) or Singapore.
   - **OS / Distribution**: **Ubuntu 24.04 LTS** (or Ubuntu 22.04 LTS).
   - **Droplet Type**: **Basic**
   - **CPU Options**: **Regular** ➔ **$6/month** (1 GB RAM / 1 CPU / 25 GB SSD) or **$12/month** (2 GB RAM recommended for faster builds).
   - **Authentication**: Choose **SSH Key** (recommended) or create a secure root password.
   - **Hostname**: Give it an identifiable name like `photoplanet-prod`.
4. Click **Create Droplet**.
5. Once created (takes ~45 seconds), copy the **IPv4 Public IP** of your droplet (e.g., `159.65.123.45`).

---

## Step 2: Point Subdomain on GoDaddy

1. Log into your **GoDaddy Account** and open the **My Products** page.
2. Find your domain **`photoplanet.in`** and click **DNS** (or **Manage DNS**).
3. In the **DNS Records** table, look for existing records or click **Add New Record**:
   - **Type**: `A`
   - **Name**: `qt` *(this represents the subdomain `qt.photoplanet.in`)*
   - **Value / Data**: Paste your **DigitalOcean Droplet IP** (e.g., `159.65.123.45`)
   - **TTL**: `1/2 Hour` (or `600 seconds` / `Default`)
4. Click **Save**.

> 💡 **DNS Propagation Check**: It can take from 2 to 30 minutes for DNS to propagate. You can test it from your local terminal:
> ```bash
> ping qt.photoplanet.in
> ```
> When it returns your DigitalOcean IP, the DNS is active!

---

## Step 3: Initial Server Setup & Swap Memory

Open your terminal (PowerShell, Command Prompt, or Mac/Linux Terminal) and connect via SSH:

```bash
ssh root@<YOUR_DROPLET_IP>
```

### 1. Update the System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Configure 2GB Swap Space
*(Crucial for 1GB RAM droplets so `npm run build` will never crash from memory exhaustion)*:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Setup UFW Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## Step 4: Install Required Packages

### 1. Install Node.js 22 LTS & Build Tools
```bash
# Add NodeSource official repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js, git, and build tools
sudo apt install -y nodejs git build-essential

# Verify versions
node -v
npm -v
```

### 2. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 3. Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 4. Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

---

## Step 5: Setup PostgreSQL Database

### 1. Create Database User and Database
Run the following in the Droplet terminal:

```bash
# Switch to postgres superuser
sudo -u postgres psql
```

Inside the PostgreSQL prompt (`postgres=#`), run the following SQL commands (replace `StrongPassword2026!` with your preferred strong password):

```sql
CREATE DATABASE photoplanet;
CREATE USER photoplanet_user WITH ENCRYPTED PASSWORD 'StudioGfxqt!2026';
GRANT ALL PRIVILEGES ON DATABASE photoplanet TO photoplanet_user;
ALTER DATABASE photoplanet OWNER TO photoplanet_user;

-- Grant schema permissions for PostgreSQL 15+
\c photoplanet
GRANT ALL ON SCHEMA public TO photoplanet_user;
\q
```

---

## Step 6: Deploy Code & Build Application

### 1. Create App Directory & Clone Repo
```bash
mkdir -p /var/www
cd /var/www

# Option A: Clone from GitHub
git clone https://github.com/Abhisek-labala/photoplanet.git
cd /var/www/photoplanet

# (Or Option B: If deploying manually without GitHub, see the SCP file transfer tip below)
```

*(Tip: If not using GitHub, you can zip your local folder and transfer it using SCP from your computer)*:
```powershell
# Run from your local computer:
scp -r "d:\personal\photo planet pwa" root@<YOUR_DROPLET_IP>:/var/www/photoplanet
```

### 2. Initialize Database Schema & Seed Data
Run the provided `schema.sql` to create all tables and initial admin credentials, and grant ownership to `photoplanet_user`:

```bash
cd /var/www/photoplanet

# Run schema as postgres
sudo -u postgres psql -d photoplanet -f backend/schema.sql

# Grant full table & sequence permissions to photoplanet_user
sudo -u postgres psql -d photoplanet -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO photoplanet_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO photoplanet_user; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO photoplanet_user; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO photoplanet_user;"
```

### 3. Create the Production Environment File
Create `/var/www/photoplanet/backend/.env`:

```bash
nano /var/www/photoplanet/backend/.env
```

Paste the following configuration:

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://photoplanet_user:StudioGfxqt!2026@localhost:5432/photoplanet
JWT_SECRET=photoplanet_super_secret_jwt_key_903a5a80fd56a92085f2011f5552a44e
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
DATA_DIR=/var/www/photoplanet/data
```

Save and exit: press `Ctrl + O`, then `Enter`, then `Ctrl + X`.

### 4. Install Dependencies & Build Frontend
```bash
cd /var/www/photoplanet

# Install backend dependencies
cd backend
npm install --production=false
cd ..

# Install frontend dependencies and build production bundle
cd frontend
npm install
npm run build
cd ..
```

---

## Step 7: Configure PM2 Process Manager

PM2 keeps your server running 24/7 and automatically restarts it if the server reboots or crashes.

```bash
cd /var/www/photoplanet

# Start the application
pm2 start backend/server.js --name "photoplanet"
pm2 save
pm2 startup systemd
```
*(Copy and run the `sudo env PATH=...` command that `pm2 startup` outputs on screen if prompted).*

### Check PM2 Status:
```bash
pm2 status
pm2 logs photoplanet --lines 20
```

---

## Step 8: Configure Nginx Reverse Proxy

Create an Nginx configuration file for your subdomain:

```bash
sudo nano /etc/nginx/sites-available/qt.photoplanet.in
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name qt.photoplanet.in;

    # Allow up to 50MB uploads (for high-res logos and JSON backups)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit: `Ctrl + O`, `Enter`, `Ctrl + X`.

### Enable the Site & Restart Nginx:
```bash
# Enable the configuration
sudo grep -i "qt.photoplanet.in" /etc/nginx/sites-available/qt.photoplanet.in
sudo ln -s /etc/nginx/sites-available/qt.photoplanet.in /etc/nginx/sites-enabled/

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 9: Install Free SSL Certificate (HTTPS)

*(PWA requires HTTPS to enable Service Worker caching and installability)*

Make sure your GoDaddy DNS for `qt.photoplanet.in` has propagated, then run:

```bash
sudo certbot --nginx -d qt.photoplanet.in
```

1. Enter your email address when prompted (for renewal notices).
2. Agree to the Terms of Service (`Y`).
3. Certbot will automatically verify domain ownership, generate SSL certificates, and configure Nginx with HTTP-to-HTTPS redirect!

### Verify Auto-Renewal:
Certbot installs a cronjob that automatically renews the certificate every 60 days. Test it with:
```bash
sudo certbot renew --dry-run
```

---

## Step 10: Verify & Test PWA Installation

1. Open your browser and navigate to:
   **`https://qt.photoplanet.in`**
2. Log in using default credentials:
   - **Username**: `admin`
   - **Password**: `ChangeMe123!`
3. Immediately navigate to **Staff & Access** in the sidebar to change your admin password.
4. **PWA Mobile Testing**:
   - Open `https://qt.photoplanet.in` on Chrome (Android) or Safari (iOS).
   - Tap **Add to Home Screen** / **Install App**.
   - Launch the app from your home screen — it will open in full-screen standalone app mode!

---

## 🔄 1-Click Update Script

Whenever you make changes to your code in the future, create an update script on your droplet:

```bash
sudo nano /var/www/photoplanet/update.sh
```

Paste:
```bash
#!/bin/bash
set -e
cd /var/www/photoplanet

echo ">>> Pulling latest changes..."
git pull

echo ">>> Installing dependencies..."
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

echo ">>> Building frontend..."
cd frontend && npm run build && cd ..

echo ">>> Restarting backend with PM2..."
pm2 restart photoplanet

echo ">>> Update Complete!"
```

Make it executable:
```bash
chmod +x /var/www/photoplanet/update.sh
```

Now, updating your production app takes a single command:
```bash
/var/www/photoplanet/update.sh
```

---

## 🛠️ Helpful Commands & Troubleshooting

| Action | Command |
|---|---|
| View Live Backend Logs | `pm2 logs photoplanet` |
| Restart Backend App | `pm2 restart photoplanet` |
| View Nginx Error Logs | `sudo tail -f /var/log/nginx/error.log` |
| Reload Nginx Config | `sudo systemctl reload nginx` |
| Check PostgreSQL Status | `sudo systemctl status postgresql` |
| Connect to DB CLI | `sudo -u postgres psql -d photoplanet` |
| Reset Admin 2FA | `node /var/www/photoplanet/backend/scripts/reset-2fa.js admin` |
| Take Manual DB Dump | `pg_dump -U photoplanet_user -h localhost photoplanet > backup_$(date +%F).sql` |

