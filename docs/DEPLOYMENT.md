# Deployment Guide - Self-Hosting Alternatives

This guide covers multiple deployment approaches for self-hosting your monorepo, especially if you're facing Docker issues.

## Option 1: Direct VM Deployment (Recommended if Docker is problematic)

This approach builds and runs directly on your VM without Docker containers.

### Prerequisites

1. **VM Setup**:
   - Ubuntu 20.04+ or similar Linux distribution
   - Node.js 18+ (for Next.js runtime)
   - Bun installed globally
   - PostgreSQL database (local or remote)
   - Redis server (local or remote)
   - Nginx (for reverse proxy)

2. **Install Bun on VM**:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   export PATH="$HOME/.bun/bin:$PATH"
   ```

3. **Install Node.js** (for Next.js):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PostgreSQL & Redis**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y postgresql redis-server
   sudo systemctl start postgresql
   sudo systemctl start redis-server
   ```

### Deployment Steps

1. **Clone/Update Repository**:
   ```bash
   cd /opt
   git clone <your-repo-url> bitrix-monorepo
   cd bitrix-monorepo
   # Or if already exists:
   git pull origin main
   ```

2. **Install Dependencies**:
   ```bash
   bun install
   ```

3. **Set Environment Variables**:
   ```bash
   # Create .env files
   cp apps/frontend/.env.example apps/frontend/.env
   cp apps/worker/.env.example apps/worker/.env
   # Edit with your actual values
   nano apps/frontend/.env
   nano apps/worker/.env
   ```

4. **Build Applications**:
   ```bash
   bun run build
   ```

5. **Run with PM2** (see `ecosystem.config.js` below):
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Follow instructions to enable on boot
   ```

### Process Management Options

#### Option A: PM2 (Recommended)

PM2 is a process manager that keeps your apps running and restarts them on crashes.

See `ecosystem.config.js` in the root directory.

#### Option B: Systemd Services

See `deploy/systemd/` directory for service files.

#### Option C: Simple Background Processes

```bash
# Frontend
cd apps/frontend
nohup node .next/standalone/apps/frontend/server.js > /var/log/frontend.log 2>&1 &

# Worker
cd apps/worker
nohup bun index.ts > /var/log/worker.log 2>&1 &
```

### Nginx Configuration

Create `/etc/nginx/sites-available/bitrix`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Worker health check (optional)
    location /health {
        proxy_pass http://localhost:8080/health;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/bitrix /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Option 2: Build Locally, Deploy Artifacts

Build on your local machine and deploy only the built artifacts.

### Local Build Script

```bash
#!/bin/bash
# build-and-package.sh

set -e

echo "Building monorepo..."
bun run build

echo "Creating deployment package..."
tar -czf deployment.tar.gz \
  apps/frontend/.next \
  apps/frontend/public \
  apps/worker \
  packages \
  node_modules \
  package.json \
  bun.lock

echo "Deployment package created: deployment.tar.gz"
```

### VM Deployment Script

```bash
#!/bin/bash
# deploy-to-vm.sh

set -e

VM_USER="your-user"
VM_HOST="your-vm-ip"
VM_PATH="/opt/bitrix-monorepo"

echo "Uploading deployment package..."
scp deployment.tar.gz $VM_USER@$VM_HOST:/tmp/

echo "Deploying on VM..."
ssh $VM_USER@$VM_HOST << 'ENDSSH'
  set -e
  cd /opt/bitrix-monorepo
  
  # Backup current deployment
  [ -d .next ] && mv .next .next.backup || true
  
  # Extract new deployment
  tar -xzf /tmp/deployment.tar.gz
  
  # Restart services
  pm2 restart all || systemctl restart bitrix-frontend bitrix-worker
  
  echo "Deployment complete!"
ENDSSH
```

---

## Option 3: GitHub Actions → VM (No Docker)

Update your GitHub Actions workflow to deploy directly without Docker.

See `.github/workflows/deploy-vm-direct.yml` (created below).

---

## Option 4: Simplified Docker (If you want to fix Docker)

If you want to try fixing Docker issues, common problems are:

1. **Turbo prune issues**: Ensure all workspace dependencies are properly declared
2. **Build context**: Make sure Dockerfile context includes the entire monorepo
3. **Node/Bun version mismatches**: Ensure consistent versions
4. **Missing dependencies**: Check that all packages are in `package.json`

### Quick Docker Fix Checklist

- [ ] Verify `turbo prune` works: `turbo prune frontend --docker`
- [ ] Check Docker build context includes root `package.json`
- [ ] Ensure all workspace packages are listed in root `package.json`
- [ ] Verify Bun installation in Dockerfile
- [ ] Check Next.js standalone output is enabled (already done in `next.config.ts`)

---

## Environment Variables

Both apps need these environment variables:

### Frontend (`apps/frontend/.env`)
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
AUTH_SECRET=...
REDIS_URL=redis://...
NODE_ENV=production
PORT=3000
```

### Worker (`apps/worker/.env`)
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_URL=redis://...
NODE_ENV=production
PORT=8080
AI_API_KEY=...
GCLOUD_PROJECT_ID=...
GCLOUD_BUCKET=...
GCS_CLIENT_EMAIL=...
GCS_PRIVATE_KEY=...
```

---

## Monitoring & Logs

### PM2
```bash
pm2 logs          # View all logs
pm2 logs frontend # View frontend logs
pm2 logs worker   # View worker logs
pm2 monit         # Real-time monitoring
pm2 status        # Check status
```

### Systemd
```bash
sudo journalctl -u bitrix-frontend -f
sudo journalctl -u bitrix-worker -f
```

---

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `bun install`
- Check Node.js version: `node --version` (should be 18+)
- Verify Bun version: `bun --version`

### Apps Won't Start
- Check environment variables are set correctly
- Verify PostgreSQL and Redis are running
- Check port availability: `netstat -tulpn | grep :3000`

### Performance Issues
- Use PM2 cluster mode for Next.js (see ecosystem.config.js)
- Monitor memory usage: `pm2 monit`
- Consider increasing VM resources

---

## Recommended Approach

**For simplicity and reliability**: Use **Option 1 (Direct VM Deployment with PM2)**

This avoids Docker complexity while providing:
- ✅ Easy deployment
- ✅ Process management (auto-restart)
- ✅ Log management
- ✅ Simple updates (git pull + rebuild)
- ✅ No container overhead
