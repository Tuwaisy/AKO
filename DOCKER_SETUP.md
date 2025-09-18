# 🐳 Docker Setup Guide for AKO LMS

## 🚀 Quick Docker Installation (Windows)

### Option 1: Docker Desktop (Recommended)

1. **Download Docker Desktop:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Or direct link: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

2. **Install Docker Desktop:**
   ```powershell
   # Run the installer as Administrator
   # Follow the installation wizard
   # Enable WSL 2 if prompted
   ```

3. **Start Docker Desktop:**
   - Launch Docker Desktop from Start Menu
   - Wait for Docker Engine to start (whale icon in system tray)
   - Sign in or create Docker Hub account (optional)

### Option 2: Using Chocolatey (if you have it)

```powershell
# Install Docker Desktop via Chocolatey
choco install docker-desktop
```

### Option 3: Using Winget (Windows Package Manager)

```powershell
# Install Docker Desktop via winget
winget install Docker.DockerDesktop
```

---

## ✅ Verify Docker Installation

After installation, verify Docker is working:

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Test Docker installation
docker run hello-world
```

Expected output:
```
Docker version 24.0.x, build xxxxx
Docker Compose version v2.21.x
Hello from Docker!
```

---

## 🔧 Docker Configuration for AKO LMS

### 1. Enable Required Features

In Docker Desktop settings:
- ✅ **General** → "Use Docker Compose V2"
- ✅ **Resources** → Memory: 4GB minimum (8GB recommended)
- ✅ **Resources** → CPU: 2 cores minimum
- ✅ **Advanced** → Enable file sharing for your project directory

### 2. WSL 2 Setup (if needed)

If you see WSL 2 related errors:

```powershell
# Enable WSL 2 features
wsl --install

# Set WSL 2 as default
wsl --set-default-version 2

# Restart your computer
```

---

## 🚀 Quick Start After Docker Installation

Once Docker is installed and running:

```bash
# Navigate to project
cd /d/Nextera/AKO/AKO/ako-lms

# Start all services
docker compose up -d

# Check services are running
docker compose ps

# View logs if needed
docker compose logs
```

Expected services:
```
NAME                    IMAGE          STATUS
ako-lms-postgres-1      postgres:15    Up
ako-lms-redis-1         redis:7-alpine Up
ako-lms-minio-1         minio/minio    Up
ako-lms-mailhog-1       mailhog/mailhog Up
```

---

## 🐛 Common Docker Issues & Fixes

### Issue: "Docker daemon is not running"
```bash
# Solution: Start Docker Desktop
# Check system tray for Docker whale icon
# Wait for it to turn green/white (not orange)
```

### Issue: "WSL 2 installation is incomplete"
```powershell
# Update WSL
wsl --update

# Set default version
wsl --set-default-version 2

# Restart Docker Desktop
```

### Issue: "Port already in use"
```bash
# Check what's using the ports
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Stop conflicting services or change ports in docker-compose.yml
```

### Issue: "Permission denied" or "Access denied"
```powershell
# Run PowerShell as Administrator
# Or add your user to docker-users group:
net localgroup docker-users YourUsername /add
```

### Issue: "Docker Compose not found"
```bash
# Use newer syntax
docker compose up -d

# Instead of old syntax
docker-compose up -d
```

---

## 🔍 Verify Everything Works

After Docker is running:

```bash
# 1. Start services
cd /d/Nextera/AKO/AKO/ako-lms
docker compose up -d

# 2. Check all services are healthy
docker compose ps

# 3. Test database connection
docker compose exec postgres psql -U postgres -d ako_lms_db -c "SELECT 1;"

# 4. Test Redis
docker compose exec redis redis-cli ping

# 5. Access service UIs
# PostgreSQL: localhost:5432
# Redis: localhost:6379
# MinIO Console: http://localhost:9001
# MailHog: http://localhost:8025
```

---

## 🏃‍♂️ Quick Test Run

Once Docker is working, test the full system:

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Setup API
cd api
npm run db:setup    # This will run migrations and seed
npm run dev

# 3. In another terminal - Start Web
cd ../web
npm run dev

# 4. Test the system
# Web: http://localhost:3000
# API: http://localhost:4000/health
```

---

## 📊 Docker Resource Requirements

### Minimum Requirements:
- **RAM**: 4GB available to Docker
- **CPU**: 2 cores
- **Disk**: 10GB free space
- **Network**: Internet connection for image downloads

### Recommended:
- **RAM**: 8GB available to Docker
- **CPU**: 4 cores
- **Disk**: 20GB free space
- **SSD**: For better database performance

---

## 🔧 Docker Desktop Settings

Recommended Docker Desktop configuration:

### General Tab:
- ✅ Use Docker Compose V2
- ✅ Start Docker Desktop when you log in
- ✅ Open Docker Dashboard when Docker Desktop starts

### Resources → Advanced:
- **CPUs**: 2-4 cores
- **Memory**: 4-8 GB
- **Swap**: 1 GB
- **Disk image size**: 64 GB

### Resources → File Sharing:
- ✅ Add: `D:\Nextera\AKO` (your project directory)

---

## 🚨 Troubleshooting Commands

If you encounter issues:

```bash
# Check Docker service status
docker info

# Restart Docker services
docker compose down
docker compose up -d

# Clean up Docker system
docker system prune

# Reset Docker Desktop (last resort)
# Settings → Troubleshoot → Reset to factory defaults
```

---

## 📞 Alternative if Docker Issues Persist

If Docker installation fails or causes issues, you can run AKO LMS without Docker using local databases:

### Install PostgreSQL Locally:
```powershell
# Using Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

### Install Redis Locally:
```powershell
# Using Chocolatey  
choco install redis-64

# Or use Redis on Windows: https://github.com/microsoftarchive/redis/releases
```

### Update Environment Variables:
```env
# In api/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ako_lms_db"
REDIS_URL="redis://localhost:6379"
```

---

## ✅ Success Checklist

Docker is properly set up when:
- [ ] `docker --version` shows version info
- [ ] `docker compose version` shows version info
- [ ] `docker run hello-world` succeeds
- [ ] Docker Desktop shows green whale icon
- [ ] `docker compose up -d` starts all services
- [ ] `docker compose ps` shows all containers running
- [ ] Services accessible at their ports

---

## 🎯 Next Steps After Docker Setup

1. **Start the services:**
   ```bash
   cd /d/Nextera/AKO/AKO/ako-lms
   docker compose up -d
   ```

2. **Run the setup script:**
   ```bash
   ./test-setup.sh  # or test-setup.ps1 in PowerShell
   ```

3. **Test the application:**
   - Web: http://localhost:3000
   - API: http://localhost:4000/health

**Happy Docker-ing! 🐳✨**