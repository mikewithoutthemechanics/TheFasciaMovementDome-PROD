# Deployment Setup Verification Script
# Run this after setting up your API keys in .env

param(
    [switch]$InstallMissing
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TFMD Booking App - Setup Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# Check .env file exists
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
    
    # Load .env
    $envContent = Get-Content ".env" -Raw
    
    # Check for placeholder values
    $placeholders = @(
        "your-project.supabase.co",
        "your_anon_key_here",
        "your_service_role_key_here",
        "your_access_token_here",
        "pk_test_your_key_here",
        "sk_test_your_key_here",
        "re_your_api_key_here",
        "your-verified@domain.com",
        "your_vercel_token_here",
        "ghp_your_github_token_here"
    )
    
    $foundPlaceholders = $placeholders | Where-Object { $envContent -match $_ }
    
    if ($foundPlaceholders) {
        Write-Host "  ⚠ Found placeholder values in .env:" -ForegroundColor Yellow
        $foundPlaceholders | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }
        Write-Host "  Please replace with actual API keys`n" -ForegroundColor Yellow
        $allGood = $false
    } else {
        Write-Host "  ✓ No placeholder values found`n" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ .env file not found. Run setup first.`n" -ForegroundColor Red
    $allGood = $false
}

# Check CLI tools
Write-Host "Checking CLI tools..." -ForegroundColor Yellow

$tools = @(
    @{ Name = "Node.js"; Command = "node --version"; Install = "https://nodejs.org/" },
    @{ Name = "npm"; Command = "npm --version"; Install = "https://nodejs.org/" },
    @{ Name = "Vercel CLI"; Command = "vercel --version"; Install = "npm i -g vercel" },
    @{ Name = "Supabase CLI"; Command = "supabase --version"; Install = "npm i -g supabase" },
    @{ Name = "Git"; Command = "git --version"; Install = "https://git-scm.com/download/win" }
)

foreach ($tool in $tools) {
    try {
        $version = Invoke-Expression $tool.Command 2>$null
        Write-Host "  ✓ $($tool.Name): $version" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $($tool.Name) not found" -ForegroundColor Red
        if ($InstallMissing) {
            Write-Host "    Installing..." -ForegroundColor Yellow
            Invoke-Expression $tool.Install
        } else {
            Write-Host "    Install with: $($tool.Install)" -ForegroundColor Gray
        }
        $allGood = $false
    }
}

Write-Host ""

# Check MCP servers
Write-Host "Checking MCP servers..." -ForegroundColor Yellow

$mcpDir = "$env:USERPROFILE\mcp-servers"
if (Test-Path "$mcpDir\mcp-send-email\dist\index.js") {
    Write-Host "  ✓ Resend MCP Server installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Resend MCP Server not found" -ForegroundColor Red
    Write-Host "    Run setup script to install" -ForegroundColor Gray
    $allGood = $false
}

$claudeMcp = "$env:USERPROFILE\.claude\mcp.json"
$cursorMcp = "$env:USERPROFILE\.cursor\mcp.json"

if (Test-Path $claudeMcp) {
    Write-Host "  ✓ Claude MCP config exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ Claude MCP config not found" -ForegroundColor Red
}

if (Test-Path $cursorMcp) {
    Write-Host "  ✓ Cursor MCP config exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ Cursor MCP config not found" -ForegroundColor Red
}

Write-Host ""

# Check Docker (optional, for GitHub MCP)
Write-Host "Checking Docker (optional, for GitHub MCP)..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "  ✓ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Docker not installed (optional)" -ForegroundColor Yellow
    Write-Host "    Install from: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Gray
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✓ Setup Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "  1. Run: npm run dev" -ForegroundColor White
    Write-Host "  2. Run: vercel link" -ForegroundColor White
    Write-Host "  3. Run: vercel --prod" -ForegroundColor White
} else {
    Write-Host "  ⚠ Setup Incomplete" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Please fix the issues above before deploying." -ForegroundColor Yellow
    Write-Host "See DEPLOYMENT_SETUP.md for detailed instructions." -ForegroundColor Gray
}
