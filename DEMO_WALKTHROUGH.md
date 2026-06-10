# 🎬 Interactive Portal Demo - Step-by-Step Walkthrough

## Demo Scenario: Deploy a Cloud Run Microservice

This guide provides a **complete walkthrough** you can follow or present to showcase the portal.

---

## 🎯 Demo Objective

**Deploy a production-ready Cloud Run microservice with:**
- Service name: `payment-processor-api`
- Environment: Development (auto-approved)
- Region: London (europe-west2)
- Building blocks: Database + Pub/Sub + Monitoring
- Estimated cost: $450/month

**Duration**: 5 minutes  
**Complexity**: Beginner (good for first-time users)

---

## Demo Walkthrough

### ⏱️ **[0:00-0:30] Welcome & Login**

**Narration:**
> "Welcome to the Infrastructure Deployment Portal. Today we're going to deploy a complete cloud-native microservice without writing any infrastructure code. Let me show you how."

**Action:**
1. Open browser → http://localhost:3000
2. Shows: Beautiful dashboard with hero message
3. Note the portal header with navigation options

**What to Point Out:**
- ✅ Clean, intuitive interface
- ✅ Quick navigation menu (Home, Templates, Patterns, etc.)
- ✅ User profile showing role & permissions (top right)

---

### ⏱️ **[0:30-1:15] Explore Available Templates**

**Narration:**
> "First, let's explore what deployment options are available. The portal provides 11 pre-built templates covering compute, data, storage, and governance services."

**Action:**
1. Scroll down to see "Available Templates" section
2. OR click menu → "Templates" to see full list
3. Show card for each template with:
   - Name & description
   - Use case
   - Estimated monthly cost
   - Required approvals (if any)

**Template Cards to Highlight:**

```
Card 1: Cloud Run Service
├─ Icon: ⚡ (lightning)
├─ Description: Serverless containerized service on GCP Cloud Run
├─ Cost: $50-200/month
└─ ✅ No approval needed for Dev
```

```
Card 2: Google Kubernetes Engine
├─ Icon: 🐳 (container)
├─ Description: Managed Kubernetes for complex workloads
├─ Cost: $400-1000/month
└─ ⚠️ Requires architect approval
```

```
Card 3: Data Pipeline
├─ Icon: 📊 (chart)
├─ Description: Streaming/batch data processing
├─ Cost: $200-500/month
└─ ⚠️ Requires data engineer review
```

**What to Point Out:**
- ✅ Cost transparency from the start
- ✅ Approval requirements are clear
- ✅ Descriptions help decide
- ✅ Tags filter by category

---

### ⏱️ **[1:15-2:00] Select Cloud Run Template**

**Narration:**
> "For our demo, we'll deploy a Cloud Run service. This is perfect for microservices that need to scale automatically. Let's click on it to start."

**Action:**
1. Click on "Cloud Run Service" template card
2. Shows: Template details page with:
   - Full description
   - Architecture diagram (if available)
   - "Start Deployment" button

3. Click → "Start Deployment"
4. Form appears with configuration fields

**What to Point Out:**
- ✅ Template details shown before committing
- ✅ Easy navigation back if wrong choice
- ✅ Start button clearly visible

---

### ⏱️ **[2:00-3:30] Configuration Form**

**Narration:**
> "Now we configure our service. The form guides us through 5 key steps. Let me show you each one."

**Action:**
Fill in the form fields:

#### Step 1: Service Name
```
Input: "payment-processor-api"
Note: This becomes your project ID: payment-processor-api
```
**Point Out:** Auto-generated kebab-case project ID shown below

#### Step 2: Environment
```
Dropdown: Select "Development"
Note: Dev automatically approved, Prod requires review
```
**Point Out:** Environment choice affects approval workflow

#### Step 3: Region Selection
```
Dropdown: Select "europe-west2" (London)
Available: EU, US, Asia regions
```
**Point Out:** Region affects latency, compliance, cost

#### Step 4: Building Blocks
```
Checkboxes:
☑ Enable Database (Cloud SQL)
☑ Enable Pub/Sub (Message Queue)
☑ Enable Monitoring (Cloud Monitoring)
```
**Point Out:**
- Each adds specific capabilities
- Cost automatically updates
- Can mix and match

#### Step 5: Cost Preview
```
Display:
├─ Cloud Run: $45/month
├─ Database: $150/month
├─ Pub/Sub: $120/month
└─ Monitoring: $135/month
─────────────────────────
Total: $450/month
```
**Point Out:** Full cost transparency before submission

---

### ⏱️ **[3:30-4:00] Submit Deployment**

**Narration:**
> "Everything looks good. Let's submit this deployment. Watch what happens behind the scenes."

**Action:**
1. Click "Submit Service Request" button
2. Show: Loading animation + backend processing
3. Display: Success screen with deployment details

**Success Screen Shows:**
```
✅ DEPLOYMENT SUBMITTED SUCCESSFULLY

Deployment ID: dep-1780920651668-3ivt59vqs
Status: Pending
Created by: Alice Johnson
Environment: Development
Region: europe-west2
Service Name: payment-processor-api

Next Steps:
• Your deployment is queued for processing
• Estimated setup time: 5-10 minutes
• You can track status in "My Deployments"

[View Deployment] [Return to Dashboard]
```

**Point Out:**
- ✅ Clear confirmation with deployment ID
- ✅ Status tracking available
- ✅ User email shows who submitted
- ✅ Next steps are clear

---

### ⏱️ **[4:00-4:30] View Deployment Status**

**Narration:**
> "Now let's track what's happening with our deployment in real-time."

**Action:**
1. Click "View Deployment" button
2. Shows: Deployment detail page with:

```
Deployment: payment-processor-api
├─ Status: 🟡 Pending
├─ Started: 2 seconds ago
├─ Environment: Development
├─ Region: europe-west2
├─ Estimated Time Remaining: 8 minutes
│
├─ Processing Steps:
│   ✅ Validation (completed)
│   🔄 Infrastructure Planning (in progress...)
│   ⏳ Terraform Generation
│   ⏳ GitHub PR Creation
│   ⏳ Infrastructure Deployment
│   ⏳ Health Checks
│
├─ Logs:
│   [2026-06-08 12:10:51] Payload received by resolver API
│   [2026-06-08 12:10:52] Starting infrastructure planning...
│
└─ Quick Actions:
    [View PR] [View Logs] [Cancel] [View Costs]
```

**Point Out:**
- ✅ Real-time status updates
- ✅ Step-by-step progress shown
- ✅ Logs available for debugging
- ✅ Can cancel if needed
- ✅ Cost breakdown available

---

### ⏱️ **[4:30-5:00] Dashboard Overview**

**Narration:**
> "Let's go back to the dashboard to see the full picture. Notice how we can access all our deployments, view approvals, and monitor the entire infrastructure."

**Action:**
1. Click "Home" or dashboard button
2. Show: Main dashboard with sections:

**Section 1: User Welcome**
```
👋 Welcome, Alice Johnson
📊 Role: Developer, Team Lead
🏢 Department: Platform Engineering
```

**Section 2: Recent Deployments**
```
Active Deployments (1)
├─ payment-processor-api
│   ├─ Status: 🟡 Pending (Processing...)
│   ├─ Service: Cloud Run
│   ├─ Environment: dev
│   ├─ Cost: $450/month
│   └─ Created: 2 minutes ago
```

**Section 3: Quick Stats**
```
📈 Infrastructure Summary
├─ Total Deployments: 1
├─ Active Services: 1
├─ Monthly Cost: $450
├─ Resources: 1 Cloud Run + 1 SQL + Pub/Sub
```

**Section 4: Navigation Cards**
```
[📊 Templates]  [🎯 Patterns]  [🔧 Building Blocks]
[✅ Approvals]  [👁️ Observability]  [👤 Profile]
```

**Point Out:**
- ✅ One-click access to all features
- ✅ Deployments tracked in one place
- ✅ Cost visibility
- ✅ Role-based options available

---

## 🎓 Demo Talking Points

### When Users Ask "What About Approval?"

**Answer:**
> "Great question! For production deployments, we require architect approval. Let me show you that workflow."

**Then Show:**
1. Go to "Templates" → "GKE Application"
2. Explain: "This requires architect approval for production"
3. If time: Show approvals page (need architect login)

### When Users Ask "Can I Customize More?"

**Answer:**
> "Absolutely! We have two approaches:
> 1. **Simple**: Use our templates (what we just did)
> 2. **Advanced**: Mix and match building blocks for custom setups"

**Then Show:**
1. Click "Advanced Patterns"
2. Show: PAT-002 (Serverless Platform)
3. Explain: "This combines multiple building blocks automatically"

### When Users Ask "How Much Does This Cost?"

**Answer:**
> "Full cost transparency is built-in. You saw it in the form ($450/month total). That includes:
> - Cloud Run compute: $45
> - SQL Database: $150
> - Pub/Sub: $120
> - Monitoring & logs: $135
> 
> You can drill down into each component in the cost breakdown."

### When Users Ask "What Happens Next?"

**Answer:**
> "Behind the scenes, here's what happens:
> 1. Your configuration is validated
> 2. Our resolver API creates Terraform code
> 3. A GitHub PR is generated for review
> 4. Infrastructure is deployed to GCP
> 5. Health checks confirm everything works
> 
> You can watch all this in real-time or check logs anytime."

---

## 🎬 Alternative Demo Scenarios

### Scenario 2: Show Approval Workflow (7 minutes)

**For**: Architects, managers, stakeholders

**Flow:**
1. Start: Create deployment (Production environment)
2. Show: Approval needed message
3. Switch user to architect (bob.martinez@vodafone.com)
4. Show: Approvals page with pending request
5. Review: Risk assessment, policy compliance
6. Action: Approve deployment
7. Result: Deployment moves to execution status

**Script:** "Notice how production deployments require review. This ensures compliance and prevents unauthorized changes."

---

### Scenario 3: Show Advanced Patterns (5 minutes)

**For**: Technical teams, architects

**Flow:**
1. Go to "Advanced Patterns"
2. Select "PAT-002: Serverless Application Platform"
3. Show: Building blocks included (Network, IAM, Monitoring, Security)
4. Explain: "This is a complete production setup combining best practices"
5. Show: How each block contributes
6. Cost: $750-1500/month (production-grade)

**Script:** "Patterns save time by bundling proven combinations. Instead of manually selecting each block, we provide enterprise-ready templates."

---

### Scenario 4: Show Observability (5 minutes)

**For**: Operations, DevOps teams

**Flow:**
1. Go to "Observability" tab
2. Show: Live metrics dashboard
   - CPU, Memory usage
   - Request rates
   - Error rates
   - Cost trending
3. Show: Alert configuration
4. Click into a deployment → View logs

**Script:** "Once deployed, you get complete visibility. Real-time metrics, custom alerts, and detailed logs for troubleshooting."

---

## 📊 Demo Success Checklist

Before presenting, verify:

- [ ] Both servers running (frontend: 3000, backend: 3001)
- [ ] Demo user login works
- [ ] Templates page loads with all 11 templates
- [ ] Configuration form accepts input
- [ ] Deployment submission returns ID
- [ ] Status page shows progression
- [ ] Dashboard reflects new deployment
- [ ] Cost calculations are visible
- [ ] All navigation links work
- [ ] Response times are acceptable

---

## 💾 Pre-Demo Checklist

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

2. **Verify connectivity:**
   ```bash
   curl http://localhost:3000  # Should return HTML
   curl http://localhost:3001/health  # Should return 200 OK
   ```

3. **Clear any previous deployments:**
   - Restart backend (clears in-memory deployments)
   - This ensures clean demo state

4. **Open browser:**
   - http://localhost:3000
   - Make sure you're at clean dashboard

5. **Test form submission:**
   - Quick test with dummy data
   - Verify success response works

---

## 🎤 Demo Script (5-Minute Version)

```
[0:00] "Welcome everyone! Today I'm showing you our new Infrastructure 
       Deployment Portal. This lets anyone deploy cloud services without 
       writing code or managing infrastructure manually."

[0:15] "Here's the dashboard. Notice three key things:
       1. Clean, intuitive interface
       2. Role-based access (I'm a developer)
       3. Quick navigation to templates, patterns, and approvals"

[0:45] "We have 11 pre-built templates. Let me show a few:
       - Cloud Run: For microservices
       - GKE: For Kubernetes workloads
       - Data Pipeline: For ETL jobs
       Each comes with cost estimates and approval requirements."

[1:30] "Let's deploy Cloud Run. I'll fill in the form - notice how it
       guides us through 5 steps: name, environment, region, building
       blocks, and cost preview."

[2:45] "Cost? $450/month total. Cloud Run is $45, database $150, pub/sub
       $120, and monitoring $135. Everything transparent."

[3:00] "Let's submit. Notice the clear confirmation with deployment ID.
       Our backend is now processing the deployment."

[3:45] "Here's the status page. Watch in real-time as the deployment
       progresses: validation → planning → terraform → deployment →
       health checks. Logs are available if anything goes wrong."

[4:30] "Back to the dashboard. Our new deployment shows up here, tracking
       status and cost. Architects can view pending approvals. You can
       monitor everything from one place."

[5:00] "Questions?"
```

---

## 🎯 Key Messages to Communicate

1. **Simplicity**: No infrastructure code needed
2. **Speed**: Deploy production services in minutes
3. **Safety**: Built-in approvals and policy checks
4. **Cost**: Transparent pricing, no surprises
5. **Compliance**: Audit trail, governance built-in
6. **Flexibility**: Templates for simple, patterns for complex
7. **Visibility**: Real-time monitoring and logs
8. **Scalability**: From dev to production in one workflow

---

## 📝 Notes for Presenters

- **Go slowly on forms**: Let the form fill take 1-2 minutes (people need to see each field)
- **Emphasize cost**: Many stakeholders care most about this
- **Show approval process**: If you have architect access, show how it works
- **Use real scenarios**: Refer to actual team projects if possible
- **Practice once first**: Demos work best when you've done them before
- **Have a backup**: Screenshot of success screen if demos are finicky
- **Engage audience**: Ask "What would you deploy?" after showing templates

---

## 🚀 What To Do After Demo

1. **For Developers**: "Try deploying your own service"
2. **For Architects**: "Review approval workflow and policies"
3. **For Managers**: "Check cost projections for your team"
4. **For Everyone**: "Bookmark the portal, explore templates"

---

**Demo Version**: 1.0  
**Last Tested**: June 2026  
**Duration**: 5 minutes (can extend to 7-10 with Q&A)
