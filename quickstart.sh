#!/bin/bash
# Quick Start Script - IDP Portal Complete Setup
# Run this in the project root directory

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🏗️  IDP Portal - Quick Start Setup                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${YELLOW}⚠ Terraform not found (optional - needed only for deployment)${NC}"
else
    echo -e "${GREEN}✓ Terraform $(terraform -v | head -1)${NC}"
fi

echo ""

# Setup Backend
echo -e "${BLUE}Setting up Backend...${NC}"
cd backend
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from template${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists${NC}"
fi

if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Installed backend dependencies${NC}"
else
    echo -e "${YELLOW}⚠ node_modules already exists${NC}"
fi

cd ..
echo ""

# Setup Frontend
echo -e "${BLUE}Setting up Frontend...${NC}"
cd frontend
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    echo -e "${GREEN}✓ Created .env.local from template${NC}"
else
    echo -e "${YELLOW}⚠ .env.local already exists${NC}"
fi

if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Installed frontend dependencies${NC}"
else
    echo -e "${YELLOW}⚠ node_modules already exists${NC}"
fi

cd ..
echo ""

# Setup Terraform
echo -e "${BLUE}Setting up Terraform (infra/cloud-run)...${NC}"
cd infra/cloud-run
if [ ! -f "terraform.tfvars" ]; then
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${YELLOW}⚠ Created terraform.tfvars - please edit with your GCP project ID${NC}"
else
    echo -e "${YELLOW}⚠ terraform.tfvars already exists${NC}"
fi

if [ ! -f ".terraform" ] && command -v terraform &> /dev/null; then
    echo -e "${YELLOW}Run 'terraform init' after customizing terraform.tfvars${NC}"
fi

cd ../..
echo ""

# Create .env files with defaults if missing
echo -e "${BLUE}Checking environment files...${NC}"
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠ backend/.env not found${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠ frontend/.env.local not found${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗"
echo -e "║  ✓ Setup Complete!                                          ║"
echo -e "╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Configure Environment Variables:"
echo "   - Edit backend/.env if needed"
echo "   - Edit frontend/.env.local if needed"
echo "   - Edit infra/cloud-run/terraform.tfvars with your GCP Project ID"
echo ""

echo "2. Run Backend (Terminal 1):"
echo "   cd backend"
echo "   npm run dev"
echo "   # Runs on http://localhost:3001"
echo ""

echo "3. Run Frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm run dev"
echo "   # Runs on http://localhost:3000"
echo ""

echo "4. Open in Browser:"
echo "   http://localhost:3000"
echo ""

echo "5. Demo Users (use any of these):"
echo "   • Alice Johnson (Developer) - alice@company.com"
echo "   • Bob Smith (Developer) - bob@company.com"
echo "   • Carol White (Admin/Architect) - carol@company.com"
echo ""

echo "6. Deploy Terraform (Optional):"
echo "   cd infra/cloud-run"
echo "   terraform init"
echo "   terraform plan"
echo "   terraform apply"
echo ""

echo -e "${YELLOW}📚 For detailed setup guide, see SETUP_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}Questions? Check the documentation:${NC}"
echo "  - Backend: backend/src/index.ts (API endpoints)"
echo "  - Frontend: frontend/components/IDPPortal.tsx (main component)"
echo "  - Terraform: infra/cloud-run/README.md (template docs)"
echo ""
