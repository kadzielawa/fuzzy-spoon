# 🎯 Quick Reference Card - Portal Features at a Glance

## 🚀 Fast Access Links

| Feature | What to Do | Time |
|---------|-----------|------|
| **Deploy Service** | Dashboard → Templates → Cloud Run | 3 min |
| **View Status** | Dashboard → My Deployments → [Service] | 30 sec |
| **Browse Patterns** | Dashboard → Advanced Patterns | 2 min |
| **Check Approvals** | Approvals tab (architects only) | 1 min |
| **View Profile** | Top-right menu → Profile | 30 sec |
| **See Costs** | Deployment → Cost Breakdown | 1 min |
| **Check Logs** | Deployment → View Logs | 2 min |

---

## 👥 Demo Users

```
Developer (Alice)
├─ Email: alice.johnson@vodafone.com
├─ Roles: developer, team-lead
└─ Can: Create, submit, view deployments

Architect (Bob)
├─ Email: bob.martinez@vodafone.com
├─ Roles: architect, admin
└─ Can: Approve, reject, manage policies

Data Engineer (Carol)
├─ Email: carol.chen@vodafone.com
├─ Roles: data-engineer
└─ Can: Deploy data services, view patterns
```

---

## 📋 11 Available Templates

| # | Template | Type | $$/mo | Approvals |
|---|----------|------|-------|-----------|
| 1 | Cloud Run | Compute | $50-200 | Dev: ✅ Prod: ⚠️ |
| 2 | GKE | Compute | $400-1000 | ⚠️ Required |
| 3 | Cloud Functions | Compute | $0-100 | ✅ None |
| 4 | Data Pipeline | Data | $200-500 | ⚠️ Required |
| 5 | BigQuery | Data | $100-500 | ⚠️ Required |
| 6 | Cloud Composer | Data | $300-600 | ⚠️ Required |
| 7 | Cloud Storage | Storage | $50-200 | ✅ None |
| 8 | Firebase Hosting | Storage | $0-50 | ✅ None |
| 9 | Service Account | Access | $0 | ⚠️ Required |
| 10 | GCP Project | Governance | $0 | ⚠️ Required |
| 11 | Shared VPC | Networking | $0-100 | ⚠️ Required |

---

## 🎯 6 Advanced Patterns

| Pattern | Building Blocks | Cost | Use Case |
|---------|-----------------|------|----------|
| **PAT-001** Data Ingestion | Network, Storage, IAM, Monitor | $450-750 | Data collection |
| **PAT-002** Serverless | Cloud Run, LB, Monitor, Security | $300-600 | Microservices |
| **PAT-003** Kubernetes | GKE, Mesh, Monitor, Security | $1200-2500 | Complex workloads |
| **PAT-004** Event-Driven | Pub/Sub, Functions, BQ, IAM | $200-500 | Async processing |
| **PAT-005** Batch | Composer, BQ, Storage, Monitor | $600-1200 | ETL pipelines |
| **PAT-006** VM Platform | Compute, LB, Storage, Monitor | $800-1600 | Legacy apps |

---

## 🔧 Building Blocks (Sample)

```
Infrastructure:      Data & Analytics:     Security:
├─ network          ├─ bigquery           ├─ iam
├─ compute          ├─ pubsub             ├─ security_policy
├─ storage          ├─ dataflow           ├─ keys
└─ load_balancer    └─ cloud_composer     └─ audit_logging

Operations:
├─ monitoring
├─ logging
├─ observability
└─ health_checks
```

---

## 📊 Deployment Status Flow

```
Submitted
   ↓
Pending (⏳ Processing)
   ↓
Approved (✅ Ready) or Rejected (❌)
   ↓
Executing (🔄 Deploying)
   ↓
Success (✅) or Failed (❌)
```

---

## 🔑 Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/user` | GET | Current user info |
| `/api/templates` | GET | List templates |
| `/api/catalogs/patterns` | GET | Browse patterns |
| `/api/deployments/patterns/submit` | POST | Submit deployment |
| `/api/deployments/:id/terraform` | GET | Get Terraform metadata |
| `/api/deployments/:id/terraform/main` | GET | Download main.tf |
| `/api/deployments/:id/terraform/variables` | GET | Download variables.tf |
| `/api/deployments/:id/terraform/tfvars` | GET | Download terraform.tfvars |
| `/api/stats` | GET | System statistics |

---

## 📡 Resolver Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER: Configures Pattern + Building Blocks              │
│  └─ Select pat-001, fill network/iam/storage config      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SUBMIT: POST /api/deployments/patterns/submit             │
│  └─ Create deployment record (status: pending)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ HTTPS POST
┌─────────────────────────────────────────────────────────────┐
│  RESOLVER API: Generate Terraform Configuration            │
│  ├─ Fetch GCP modules from GitHub                          │
│  ├─ Extract 11+ modules (gcs, network, iam, kms, etc)     │
│  └─ Generate main.tf, variables.tf, terraform.tfvars      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (3-5 seconds)
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: Receive & Store Files                             │
│  ├─ Validate Terraform files (not empty)                   │
│  ├─ Store in deployment (status: resolved)                │
│  └─ Return file sizes + metadata                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ JSON Response
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: Display TerraformViewer Component               │
│  ├─ Show 3 tabs: main.tf, variables.tf, terraform.tfvars   │
│  ├─ Copy to Clipboard button                               │
│  ├─ Download Individual Files                              │
│  └─ Show file sizes (25 KB total)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    [📋 Copy]           [⬇️ Download]
    │                   │
    └─→ Ready to edit   └─→ Use locally with Terraform
        or execute          (terraform init/plan/apply)
```

**Total Time**: 5-10 seconds from submit to ready-to-use Terraform files

---

---

## 💰 Cost Estimation Examples

### Cloud Run Service
```
Base Setup: $45/month
├─ 1M requests/month
├─ 256 MB memory
└─ Auto-scaling

With Database: +$150/month
With Pub/Sub: +$120/month
With Monitoring: +$135/month
─────────────────────────────
Total Example: $450/month
```

### GKE Platform
```
Base Cluster: $400-600/month
├─ 3 node pool
├─ Auto-scaling enabled
└─ Regional setup

With Add-ons:
├─ Service Mesh: +$50/month
├─ Monitoring: +$150/month
└─ Security scanning: +$100/month
─────────────────────────────
Total Example: $700-1000/month
```

---

## ⚡ 5-Step Deployment Process

```
Step 1: Select Template/Pattern
   ↓ (1 min)
Step 2: Fill Configuration
   ├─ Service name
   ├─ Environment (dev/staging/prod)
   ├─ Region
   ├─ Building blocks
   └─ Total time: 2 min
   ↓
Step 3: Review & Cost
   ├─ Verify settings
   ├─ See total cost
   └─ Total time: 1 min
   ↓
Step 4: Submit
   ├─ Validation
   ├─ Send to backend
   └─ Total time: 30 sec
   ↓
Step 5: Track Status
   ├─ Real-time updates
   ├─ Check logs
   └─ Monitor costs
   ↓
TOTAL TIME: ~5 minutes
```

---

## 🎓 Common Questions & Answers

| Q | A |
|---|---|
| **Can I change deployment after submit?** | Limited changes. Better to cancel and redeploy. |
| **What if I deploy prod by mistake?** | Prod requires architect approval - won't auto-deploy. |
| **How long for deployment?** | Dev: 5-10 min. Prod: 10-20 min (with approval). |
| **Can I cancel deployment?** | Yes, if not yet executing. Click Cancel button. |
| **What's included in cost?** | Compute, storage, networking, monitoring. No surprises. |
| **Can I download deployment details?** | Yes - logs, terraform, cost breakdown. |
| **Who can approve deployments?** | Architects and admins only. |
| **Can I reuse a previous deployment?** | Yes - clone button on deployment page. |

---

## 📱 Mobile / Tablet Support

- ✅ Dashboard responsive
- ✅ Forms work on mobile
- ✅ Status page readable
- ⚠️ Best on desktop for complex patterns
- ⚠️ Landscape mode recommended

---

## 🔐 Security & Compliance

```
✅ Role-based access control (RBAC)
✅ Audit trail for all actions
✅ User authentication required
✅ Deployment approval for prod
✅ Cost governance built-in
✅ DLP policy checks
✅ Encryption at rest & in transit
✅ IP whitelisting supported
```

---

## 🆘 Troubleshooting Quick Tips

| Issue | Solution |
|-------|----------|
| **Form won't submit** | Check all required fields filled |
| **Deployment stuck** | Check logs, may be waiting for approval |
| **High cost** | Review building blocks, disable optional |
| **Can't see deployment** | Refresh page, check filters |
| **Error on submit** | Check service name format (alphanumeric) |
| **Need approval?** | Production deployments need architect OK |

---

## 📞 Support Contacts

- **Technical Issues**: architecture-team@company.com
- **Approval Questions**: approvals@company.com
- **Cost Inquiries**: finance@company.com
- **Portal Feedback**: portal-feedback@company.com

---

## 🔗 Important URLs

```
Portal:           http://localhost:3000
API:              http://localhost:3001
Health Check:     http://localhost:3001/health
Documentation:    /README.md
Setup Guide:      /SETUP_GUIDE.md
Architecture:     /ARCHITECTURE.md
```

---

## 📅 Typical Timeline

```
Day 1:
├─ Deploy development service
└─ 30 minutes

Week 1:
├─ Test deployment
├─ Iterate configuration
└─ Prepare prod request

Week 2:
├─ Submit prod deployment
├─ Wait for approval (1-2 days)
├─ Production deployment
└─ Monitor & scale

Result:
└─ Production system live ✅
```

---

## 🎯 Success Scenarios

| Scenario | Time | Approvals |
|----------|------|-----------|
| Dev microservice | 5 min | None |
| Staging deployment | 10 min | Manager review |
| Prod service | 20 min | Architect + Manager |
| Complex pattern | 15 min | Architecture board |
| Data pipeline | 10 min | Data lead review |

---

## 💡 Pro Tips

1. **Start with Dev**: Always test in dev first
2. **Use Templates**: Faster than custom patterns
3. **Review Costs**: Check before submitting
4. **Read Descriptions**: Each template has details
5. **Save Logs**: Download for documentation
6. **Clone Deployments**: Reuse successful configs
7. **Set Alerts**: Monitor costs and performance
8. **Ask Architects**: They know best practices

---

## 🚀 Next Actions

- [ ] Log in with demo user
- [ ] Browse available templates
- [ ] Create a development deployment
- [ ] Track deployment status
- [ ] Check cost breakdown
- [ ] View logs and outputs
- [ ] Share results with team
- [ ] Plan production deployment

---

**Version**: 1.0  
**Last Updated**: June 2026  
**Print This Card**: Save for reference
