#!/bin/bash
# Windows Quick Start Script (.bat version)
# Run this in Command Prompt or PowerShell in the project root

@echo off
cls

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  🏗️  IDP Portal - Quick Start Setup (Windows)             ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check Node.js
echo Checking prerequisites...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js not found. Please install Node.js 16+
    pause
    exit /b 1
)
echo ✓ Node.js is installed

npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ npm not found
    pause
    exit /b 1
)
echo ✓ npm is installed

echo.

REM Setup Backend
echo Setting up Backend...
cd backend
if not exist ".env" (
    copy .env.example .env
    echo ✓ Created .env from template
) else (
    echo ⚠ .env already exists
)

if not exist "node_modules" (
    call npm install
    echo ✓ Installed backend dependencies
) else (
    echo ⚠ node_modules already exists
)

cd ..
echo.

REM Setup Frontend
echo Setting up Frontend...
cd frontend
if not exist ".env.local" (
    copy .env.local.example .env.local
    echo ✓ Created .env.local from template
) else (
    echo ⚠ .env.local already exists
)

if not exist "node_modules" (
    call npm install
    echo ✓ Installed frontend dependencies
) else (
    echo ⚠ node_modules already exists
)

cd ..
echo.

REM Setup Terraform
echo Setting up Terraform...
cd infra\cloud-run
if not exist "terraform.tfvars" (
    copy terraform.tfvars.example terraform.tfvars
    echo ⚠ Created terraform.tfvars - please edit with your GCP project ID
) else (
    echo ⚠ terraform.tfvars already exists
)

cd ..\..
echo.

echo ╔═══════════════════════════════════════════════════════════╗
echo ║  ✓ Setup Complete!                                        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo Next Steps:
echo.
echo 1. Run Backend (Terminal 1):
echo    cd backend
echo    npm run dev
echo    REM Runs on http://localhost:3001
echo.
echo 2. Run Frontend (Terminal 2):
echo    cd frontend
echo    npm run dev
echo    REM Runs on http://localhost:3000
echo.
echo 3. Open Browser:
echo    http://localhost:3000
echo.
pause
