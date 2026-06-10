# Resolver Integration Process Diagram

## 🔄 Complete Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE (React Frontend)                      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  1️⃣  CONFIGURATION STEP                                               │ │
│  │  ├─ Select Pattern (pat-001)                                          │ │
│  │  ├─ Fill Building Blocks:                                            │ │
│  │  │  ├─ bucket: {location: "EU"}                                       │ │
│  │  │  ├─ network: {region: "europe-west3"}                              │ │
│  │  │  ├─ iam: {display_name: "Terraform-managed"}                       │ │
│  │  │  └─ keys: {region: "europe-west3"}                                 │ │
│  │  ├─ Set Project: "my-project-dev"                                     │ │
│  │  └─ Review Cost: $595/month                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                 ⬇️                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  2️⃣  USER CLICKS "SUBMIT"                                            │ │
│  │  └─ api.deployments.patterns.submit(payload)                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                 ⬇️ HTTPS POST
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS BACKEND (Node.js)                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  3️⃣  POST /api/deployments/patterns/submit                            │ │
│  │  ├─ Validate payload (required fields)                                │ │
│  │  ├─ Create deployment record with unique ID                           │ │
│  │  │  └─ deploymentId: "dep-1780504322795-731ec0dn6"                   │ │
│  │  └─ Status: PENDING ⏳                                                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                 ⬇️                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  4️⃣  ResolverService.submitDeployment()                              │ │
│  │  ├─ Build resolver payload:                                          │ │
│  │  │  {                                                                 │ │
│  │  │    deploymentId: "dep-...",                                        │ │
│  │  │    status: "pending",                                              │ │
│  │  │    payload: { patternId, projectId, building_blocks }             │ │
│  │  │  }                                                                 │ │
│  │  └─ Prepare HTTPS request                                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                 ⬇️ HTTPS POST                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                 ⬇️ TIMEOUT: 30s
┌─────────────────────────────────────────────────────────────────────────────┐
│               RESOLVER API (Cloud Run - Remote Service)                     │
│      https://resolver-api-479677124022.europe-west2.run.app/resolve       │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  5️⃣  RESOLVER PROCESSES REQUEST                                      │ │
│  │  ├─ Parse building blocks                                             │ │
│  │  ├─ Fetch Terraform modules from GitHub                              │ │
│  │  │  ├─ github.com/rjones-projects/gcp_terraform-modules              │ │
│  │  │  ├─ Extract module: gcs                                            │ │
│  │  │  ├─ Extract module: network                                        │ │
│  │  │  ├─ Extract module: kms                                            │ │
│  │  │  ├─ Extract module: iam_service_account                            │ │
│  │  │  └─ 70+ total variables extracted                                  │ │
│  │  ├─ Generate Terraform configuration                                  │ │
│  │  └─ Return response                                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                 ⬇️                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  6️⃣  RESOLVER RESPONSE                                               │ │
│  │  {                                                                    │ │
│  │    "deploymentId": "dep-...",                                         │ │
│  │    "status": "resolved",                                              │ │
│  │    "projectId": "my-project-dev",                                     │ │
│  │    "main_tf": "terraform { ... }",       (8.2 KB)                     │ │
│  │    "variables_tf": "variable {...}",     (15.7 KB)                    │ │
│  │    "terraform_tfvars": "project_id=...", (1.2 KB)                     │ │
│  │    "summary": {                                                       │ │
│  │      "building_blocks_resolved": 5,                                   │ │
│  │      "modules_resolved": 11,                                          │ │
│  │      "variables_extracted": 70                                        │ │
│  │    }                                                                  │ │
│  │  }                                                                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                 ⬇️ HTTPS Response
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS BACKEND (Node.js)                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  7️⃣  STORE TERRAFORM FILES                                           │ │
│  │  ├─ Validate files (check not empty)                                  │ │
│  │  ├─ Store in deployment record:                                       │ │
│  │  │  {                                                                 │ │
│  │  │    terraformFiles: {                                               │ │
│  │  │      main_tf: "...",                                               │ │
│  │  │      variables_tf: "...",                                          │ │
│  │  │      terraform_tfvars: "..."                                       │ │
│  │  │    },                                                              │ │
│  │  │    resolverResponse: { summary, repository, ... }                 │ │
│  │  │  }                                                                 │ │
│  │  └─ Status: RESOLVED ✅                                               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                 ⬇️                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  8️⃣  RETURN SUCCESS RESPONSE                                         │ │
│  │  {                                                                    │ │
│  │    "deploymentId": "dep-...",                                         │ │
│  │    "status": "resolved",                                              │ │
│  │    "resolverStatus": "resolved",                                      │ │
│  │    "terraformFiles": {                                                │ │
│  │      "main_tf_size": 8234,                                            │ │
│  │      "variables_tf_size": 15678,                                      │ │
│  │      "terraform_tfvars_size": 1240                                    │ │
│  │    },                                                                 │ │
│  │    "summary": { ... }                                                 │ │
│  │  }                                                                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                 ⬇️ JSON Response
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE (React Frontend)                      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  9️⃣  DISPLAY TERRAFORM VIEWER                                        │ │
│  │  ├─ Show Status: ✅ RESOLVED                                          │ │
│  │  ├─ Display file tabs:                                                │ │
│  │  │  ┌──────────────────────────────────────────────────┐              │ │
│  │  │  │ [main.tf] [variables.tf] [terraform.tfvars]     │              │ │
│  │  │  ├──────────────────────────────────────────────────┤              │ │
│  │  │  │ terraform {                                      │              │ │
│  │  │  │   required_version = "~> 1.9"                    │              │ │
│  │  │  │   required_providers {                           │              │ │
│  │  │  │     google = {                                   │              │ │
│  │  │  │       source  = "hashicorp/google"               │              │ │
│  │  │  │       version = ">= 7.17.0"                      │              │ │
│  │  │  │     }                                             │              │ │
│  │  │  │   }                                               │              │ │
│  │  │  │ }                                                 │              │ │
│  │  │  │ ...                                               │              │ │
│  │  │  └──────────────────────────────────────────────────┘              │ │
│  │  ├─ Action buttons:                                                   │ │
│  │  │  [📋 Copy]  [⬇️ Download]  [⬇️ Download All]  [🔄 Refresh]       │ │
│  │  └─ File sizes: 8.2 KB + 15.7 KB + 1.2 KB = 25.1 KB total           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                 ⬇️                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  🔟 USER ACTIONS (OPTIONS)                                           │ │
│  │  ├─ 📋 Copy file content to clipboard                                │ │
│  │  ├─ ⬇️ Download individual files (main.tf, variables.tf, tfvars)     │ │
│  │  ├─ ⬇️ Download all files as archive                                 │ │
│  │  ├─ 🔍 View in local IDE                                             │ │
│  │  └─ ✅ Proceed to execute deployment                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Simplified Sequence Diagram

```
Frontend          Backend            Resolver API
   │                 │                    │
   │  1. Submit      │                    │
   │  Deployment     │                    │
   ├────────────────→│                    │
   │                 │                    │
   │                 │  2. POST /resolve  │
   │                 ├───────────────────→│
   │                 │                    │
   │                 │  (Processing...) │
   │                 │    3s - 5s         │
   │                 │                    │
   │                 │ 3. Terraform files │
   │                 │←───────────────────┤
   │                 │                    │
   │                 │ 4. Store Files     │
   │                 │ & Response         │
   │  5. Response    │                    │
   │←────────────────┤                    │
   │                 │                    │
   │ 6. Display      │                    │
   │ TerraformViewer │                    │
   │                 │                    │
   │ 7. User         │                    │
   │ Downloads/Views │                    │
   │                 │                    │
```

---

## 🔄 Deployment Status Progression

```
STEP 1: Configuration
┌──────────────────────────┐
│  User selects pattern    │
│  Fills building blocks   │
│  Reviews estimated cost  │
└──────────────────────────┘
         ⬇️ (Click Submit)

STEP 2: Submission
┌──────────────────────────┐
│  ⏳ Validating...        │
│  ⏳ Sending to backend.. │
└──────────────────────────┘
         ⬇️ (3-5 seconds)

STEP 3: Resolving
┌──────────────────────────┐
│  🔄 Calling Resolver API │
│  🔄 Fetching modules...  │
│  🔄 Generating files...  │
└──────────────────────────┘
         ⬇️ (2-5 seconds)

STEP 4: Success
┌──────────────────────────┐
│  ✅ Terraform files ready│
│  ✅ Files in memory      │
│  ✅ Showing viewer       │
└──────────────────────────┘
         ⬇️

STEP 5: User Options
┌──────────────────────────┐
│ [📋 Copy]                │
│ [⬇️ Download]             │
│ [🔍 View]                │
│ [✅ Review & Execute]    │
└──────────────────────────┘

TOTAL TIME: 5-10 seconds
```

---

## 📍 Available Endpoints After Resolution

```
POST /api/deployments/patterns/submit
├─ Input: pattern config
└─ Output: deployment ID + file sizes

GET /api/deployments/:deploymentId/terraform
├─ Gets: File metadata & sizes
└─ Used by: Frontend to show summary

GET /api/deployments/:deploymentId/terraform/main
├─ Returns: main.tf content
├─ Type: Plain text file
└─ Used by: Download or copy

GET /api/deployments/:deploymentId/terraform/variables
├─ Returns: variables.tf content
├─ Type: Plain text file
└─ Used by: Download or copy

GET /api/deployments/:deploymentId/terraform/tfvars
├─ Returns: terraform.tfvars content
├─ Type: Plain text file
└─ Used by: Download or copy
```

---

## 🎯 Error Handling Flow

```
Submit Request
     │
     ├─ VALID PAYLOAD? 
     │  ├─ NO → Return 400 Bad Request
     │  └─ YES ⬇️
     │
     ├─ CREATE DEPLOYMENT ✅
     │  └─ Status: PENDING
     │
     ├─ CALL RESOLVER API
     │  │
     │  ├─ TIMEOUT (>30s)? 
     │  │  ├─ YES → Continue, status stays PENDING
     │  │  └─ NO ⬇️
     │  │
     │  ├─ NETWORK ERROR?
     │  │  ├─ YES → Continue, status stays PENDING
     │  │  └─ NO ⬇️
     │  │
     │  ├─ INVALID RESPONSE?
     │  │  ├─ YES → Log error, status stays PENDING
     │  │  └─ NO ⬇️
     │  │
     │  └─ SUCCESS ✅
     │     └─ Store files, status = RESOLVED
     │
     └─ RETURN RESPONSE
        ├─ deploymentId: "dep-..."
        ├─ status: "pending" or "resolved"
        ├─ error: (if applicable)
        └─ terraformFiles: (if resolved)
```

---

## 💾 Data Storage Model

```
Deployment Record
├─ id: "dep-1780504322795-731ec0dn6"
├─ userId: "user-123"
├─ projectId: "my-project-dev"
├─ status: "resolved" | "pending" | "error"
├─ resolverStatus: "resolved" | "pending" | "error"
├─ createdAt: 2026-06-03T16:32:02.795Z
│
├─ terraformFiles (if resolved):
│  ├─ main_tf: "terraform { ... }" (8.2 KB)
│  ├─ variables_tf: "variable { ... }" (15.7 KB)
│  └─ terraform_tfvars: "project_id=..." (1.2 KB)
│
├─ resolverResponse (metadata):
│  ├─ summary:
│  │  ├─ building_blocks_resolved: 5
│  │  ├─ modules_resolved: 11
│  │  └─ variables_extracted: 70
│  └─ repository:
│     ├─ status: "success"
│     ├─ owner: "rjones-projects"
│     └─ repo: "gcp_terraform-modules"
│
└─ parameters: { buildingBlocks config }
```

---

## ⏱️ Performance Metrics

```
Operation              Duration       Status
─────────────────────────────────────────────
Validation             < 100ms        ✅ Fast
Deployment Creation    < 50ms         ✅ Fast
Resolver API Call      2-5 seconds    ⚠️ Depends on API
File Parsing           < 100ms        ✅ Fast
Response Return        < 50ms         ✅ Fast
─────────────────────────────────────────────
TOTAL (Best case)      2-5 seconds
TOTAL (Worst case)     ~30 seconds    (timeout)
```

---

## 🔐 Security Flow

```
User Request
     │
     ├─ Has Authentication Token? 
     │  ├─ NO → Return 401 Unauthorized
     │  └─ YES ⬇️
     │
     ├─ Extract User ID from Token
     │  └─ Verify token validity
     │
     ├─ Attach User ID to:
     │  ├─ Deployment record
     │  ├─ Audit log entry
     │  └─ Resolver payload
     │
     ├─ HTTPS Connection to Resolver
     │  ├─ TLS 1.2+
     │  ├─ Certificate verification
     │  └─ Encrypted payload
     │
     └─ All files stored securely
        └─ Access controlled by user ID
```

---

## 📞 API Response Examples

### Success (200)
```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "status": "resolved",
  "resolverStatus": "resolved",
  "projectId": "my-project-dev",
  "projectName": "My Project - Dev",
  "message": "Pattern resolved successfully - Terraform files generated",
  "terraformFiles": {
    "main_tf_size": 8234,
    "variables_tf_size": 15678,
    "terraform_tfvars_size": 1240
  },
  "summary": {
    "building_blocks_requested": 5,
    "building_blocks_resolved": 5,
    "modules_resolved": 11,
    "variables_extracted": 70
  }
}
```

### Pending (200)
```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "status": "pending",
  "resolverStatus": "pending",
  "projectId": "my-project-dev",
  "message": "Pattern deployment submitted - awaiting resolution",
  "error": "Resolver API timeout - will retry"
}
```

### Error (400)
```json
{
  "error": "Missing required fields: patternId, projectId, building_blocks"
}
```
