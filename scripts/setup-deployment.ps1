# Deployment Setup Script for TFMD Booking App
# Run this script to set up all required services

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TFMD Booking App - Deployment Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Create directories
$mcpDir = "$env:USERPROFILE\mcp-servers"
$projectDir = Get-Location

New-Item -ItemType Directory -Force -Path $mcpDir | Out-Null
Write-Host "✓ Created MCP servers directory" -ForegroundColor Green

# ============================================================
# 1. CHECK EXISTING TOOLS
# ============================================================
Write-Host "`n--- Checking Existing Tools ---" -ForegroundColor Yellow

# Check Git
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if ($gitInstalled) {
    Write-Host "✓ Git is installed" -ForegroundColor Green
} else {
    Write-Host "✗ Git not found. Please install Git from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# Check Node.js
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if ($nodeInstalled) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion is installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "✓ Docker is installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Docker not found. GitHub MCP Server requires Docker." -ForegroundColor Yellow
    Write-Host "  Install from: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Gray
}

# ============================================================
# 2. SETUP RESEND MCP SERVER
# ============================================================
Write-Host "`n--- Setting Up Resend MCP Server ---" -ForegroundColor Yellow

Set-Location $mcpDir

if (Test-Path "$mcpDir\mcp-send-email") {
    Write-Host "  Resend MCP Server already exists. Updating..." -ForegroundColor Gray
    Set-Location "$mcpDir\mcp-send-email"
    git pull | Out-Null
} else {
    Write-Host "  Cloning Resend MCP Server..." -ForegroundColor Gray
    git clone https://github.com/resend/mcp-send-email.git 2>&1 | Out-Null
}

Set-Location "$mcpDir\mcp-send-email"

Write-Host "  Installing dependencies..." -ForegroundColor Gray
npm install 2>&1 | Out-Null

Write-Host "  Building..." -ForegroundColor Gray
npm run build 2>&1 | Out-Null

Write-Host "✓ Resend MCP Server installed at: $mcpDir\mcp-send-email" -ForegroundColor Green

# ============================================================
# 3. PULL GITHUB MCP SERVER (Docker)
# ============================================================
Write-Host "`n--- Setting Up GitHub MCP Server ---" -ForegroundColor Yellow

if ($dockerInstalled) {
    Write-Host "  Pulling GitHub MCP Server Docker image..." -ForegroundColor Gray
    docker pull ghcr.io/github/github-mcp-server:latest 2>&1 | Out-Null
    Write-Host "✓ GitHub MCP Server Docker image ready" -ForegroundColor Green
} else {
    Write-Host "⚠ Skipped - Docker not installed" -ForegroundColor Yellow
}

# ============================================================
# 4. INSTALL VERCEL CLI
# ============================================================
Write-Host "`n--- Setting Up Vercel CLI ---" -ForegroundColor Yellow

$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelInstalled) {
    Write-Host "✓ Vercel CLI is already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing Vercel CLI..." -ForegroundColor Gray
    npm install -g vercel 2>&1 | Out-Null
    Write-Host "✓ Vercel CLI installed" -ForegroundColor Green
}

# ============================================================
# 5. INSTALL SUPABASE CLI
# ============================================================
Write-Host "`n--- Setting Up Supabase CLI ---" -ForegroundColor Yellow

$supabaseCliInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCliInstalled) {
    Write-Host "✓ Supabase CLI is already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing Supabase CLI..." -ForegroundColor Gray
    npm install -g supabase 2>&1 | Out-Null
    Write-Host "✓ Supabase CLI installed" -ForegroundColor Green
}

# ============================================================
# 6. CREATE ENVIRONMENT FILE TEMPLATE
# ============================================================
Write-Host "`n--- Creating Environment File Template ---" -ForegroundColor Yellow

Set-Location $projectDir

$envContent = @"
# ============================================
# TFMD Booking App - Environment Configuration
# ============================================

# --------------------------------------------
# Supabase Configuration (REQUIRED)
# --------------------------------------------
# Get these from: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ACCESS_TOKEN=your_access_token_here

# --------------------------------------------
# Clerk Authentication (REQUIRED)
# --------------------------------------------
# Get these from: https://dashboard.clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret

# --------------------------------------------
# Resend Email Service (REQUIRED)
# --------------------------------------------
# Get this from: https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key_here
EMAIL_SENDER_NAME="Pause - The Fascia Movement Dome"
EMAIL_SENDER_EMAIL=your-verified@domain.com

# --------------------------------------------
# Vercel Deployment (REQUIRED for deployment)
# --------------------------------------------
# Get this from: https://vercel.com/account/tokens
VERCEL_TOKEN=your_vercel_token_here

# --------------------------------------------
# GitHub (REQUIRED for MCP)
# --------------------------------------------
# Create token at: https://github.com/settings/tokens
# Required scopes: repo, read:user, read:org
GITHUB_TOKEN=ghp_your_github_token_here

# --------------------------------------------
# Google OAuth (Optional - for Calendar integration)
# --------------------------------------------
# Create at: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# --------------------------------------------
# AI Services (Optional)
# --------------------------------------------
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key

# --------------------------------------------
# Application Settings
# --------------------------------------------
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000

# CSRF Protection (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CSRF_SECRET=your_csrf_secret_here_generate_random_32_bytes
"@

$envContent | Out-File -FilePath ".env.example" -Encoding UTF8
Write-Host "✓ Created .env.example template" -ForegroundColor Green

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file from template" -ForegroundColor Green
    Write-Host "  ⚠ IMPORTANT: Edit .env and add your actual API keys!" -ForegroundColor Yellow
}

# ============================================================
# 7. CREATE MCP CONFIGURATION
# ============================================================
Write-Host "`n--- Creating MCP Configuration ---" -ForegroundColor Yellow

$mcpConfig = @"
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "`${GITHUB_TOKEN}"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "`${SUPABASE_ACCESS_TOKEN}"
      ]
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com",
      "headers": {
        "Authorization": "Bearer `${VERCEL_TOKEN}"
      }
    },
    "resend": {
      "command": "node",
      "args": [
        "$($mcpDir -replace '\\', '/')/mcp-send-email/dist/index.js"
      ],
      "env": {
        "RESEND_API_KEY": "`${RESEND_API_KEY}",
        "SENDER_EMAIL_ADDRESS": "`${EMAIL_SENDER_EMAIL}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$($projectDir -replace '\\', '/')"
      ]
    },
    "fetch": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch"
      ]
    },
    "rube": {
      "type": "http",
      "url": "https://rube.app/mcp",
      "headers": {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1c2VyXzAxS0tHS1BTQzFIS1RKSzQ3UzhXVlBBOVdXIiwib3JnSWQiOiJvcmdfMDFLS0dLVE5HNEQxRzI3RVdSSzJOSEQwUUYiLCJpYXQiOjE3NzMzMDU0Mjl9.W-qMPfsb1O5537s_aaQZhBH7inm8IQ7F3ppI-L5ejJc"
      }
    }
  }
}
"@

# Save to user's home directory for Claude/Cursor
$claudeMcpDir = "$env:USERPROFILE\.claude"
$cursorMcpDir = "$env:USERPROFILE\.cursor"

New-Item -ItemType Directory -Force -Path $claudeMcpDir | Out-Null
New-Item -ItemType Directory -Force -Path $cursorMcpDir | Out-Null

$mcpConfig | Out-File -FilePath "$claudeMcpDir\mcp.json" -Encoding UTF8
$mcpConfig | Out-File -FilePath "$cursorMcpDir\mcp.json" -Encoding UTF8

Write-Host "✓ MCP configuration saved to:" -ForegroundColor Green
Write-Host "  - $claudeMcpDir\mcp.json" -ForegroundColor Gray
Write-Host "  - $cursorMcpDir\mcp.json" -ForegroundColor Gray

# ============================================================
# 8. CREATE SERVICE SETUP GUIDE
# ============================================================
Write-Host "`n--- Creating Service Setup Guide ---" -ForegroundColor Yellow

$setupGuide = @"
# Service Setup Guide

## Quick Start Checklist

### 1. Supabase Setup ✅
- [ ] Create account at https://supabase.com
- [ ] Create a new project
- [ ] Get Project URL and Anon Key from Settings > API
- [ ] Get Service Role Key (keep secret!)
- [ ] Generate Access Token from https://app.supabase.com/account/tokens
- [ ] Run schema migrations: npx supabase db push

### 2. Clerk Setup ✅
- [ ] Create account at https://clerk.com
- [ ] Create a new application
- [ ] Get Publishable Key and Secret Key from API Keys
- [ ] Configure redirect URLs in Clerk Dashboard
- [ ] (Optional) Set up webhook for user events

### 3. Resend Setup ✅
- [ ] Create account at https://resend.com
- [ ] Verify your domain
- [ ] Generate API key
- [ ] Update sender email in .env (must be from verified domain)

### 4. Vercel Setup ✅
- [ ] Create account at https://vercel.com
- [ ] Install Vercel CLI: npm i -g vercel
- [ ] Login: vercel login
- [ ] Generate token from https://vercel.com/account/tokens

### 5. GitHub Setup ✅
- [ ] Create token at https://github.com/settings/tokens
- [ ] Required scopes: repo, read:user, read:org

## Next Steps

1. Edit your ".env" file with real API keys
2. Link project to Vercel: vercel link
3. Deploy: vercel --prod

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production

# Database
npx supabase db push     # Push schema changes
npx supabase db reset    # Reset local database

# Deployment
vercel                   # Deploy to preview
vercel --prod            # Deploy to production
```
"@

$setupGuide | Out-File -FilePath "DEPLOYMENT_SETUP.md" -Encoding UTF8
Write-Host "✓ Created DEPLOYMENT_SETUP.md guide" -ForegroundColor Green

# ============================================================
# COMPLETION
# ============================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file with your actual API keys" -ForegroundColor White
Write-Host "2. Set up accounts at:" -ForegroundColor White
Write-Host "   - Supabase: https://supabase.com" -ForegroundColor Gray
Write-Host "   - Clerk: https://clerk.com" -ForegroundColor Gray
Write-Host "   - Resend: https://resend.com" -ForegroundColor Gray
Write-Host "   - Vercel: https://vercel.com" -ForegroundColor Gray
Write-Host "3. Run: vercel login" -ForegroundColor White
Write-Host "4. Run: vercel link" -ForegroundColor White
Write-Host "5. Deploy: vercel --prod" -ForegroundColor White

Write-Host "`nSee DEPLOYMENT_SETUP.md for detailed instructions." -ForegroundColor Cyan

Set-Location $projectDir
