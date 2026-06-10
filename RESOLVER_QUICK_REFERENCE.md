# Resolver Integration - Quick Reference

## Postman Collection Mapping

| Postman Request | Backend Endpoint | Implementation |
|-----------------|------------------|-----------------|
| `POST /resolve` (local) | `POST /api/deployments/patterns/submit` | ✅ Done |
| `POST /resolve` (remote) | Direct call to resolver API | ✅ Done |
| `GET /catalog` (local) | `GET /api/catalogs/patterns` | ✅ Existing |
| `GET /catalog/item` (local) | `GET /api/catalogs/patterns/:id` | ✅ Existing |

## New Endpoints

### 1. Submit Pattern Deployment

```
POST /api/deployments/patterns/submit
```

**Body:**
```json
{
  "patternId": "pat-001",
  "projectId": "my-project-dev",
  "projectName": "My Project - Dev",
  "building_blocks": { /* block configs */ }
}
```

**Response:**
```json
{
  "deploymentId": "dep-...",
  "status": "resolved",
  "resolverStatus": "resolved",
  "terraformFiles": {
    "main_tf_size": 8234,
    "variables_tf_size": 15678,
    "terraform_tfvars_size": 1240
  }
}
```

### 2. Get Terraform Files Metadata

```
GET /api/deployments/:deploymentId/terraform
```

**Response:**
```json
{
  "deploymentId": "dep-...",
  "projectId": "my-project-dev",
  "status": "resolved",
  "terraformFiles": { /* sizes */ },
  "summary": { /* resolver summary */ }
}
```

### 3. Download Individual Files

```
GET /api/deployments/:deploymentId/terraform/main
GET /api/deployments/:deploymentId/terraform/variables
GET /api/deployments/:deploymentId/terraform/tfvars
```

Returns: Plain text file with Content-Disposition header

## Frontend Integration

### Use the API Client

```typescript
// Submit deployment
const result = await api.deployments.patterns.submit({
  patternId: 'pat-001',
  projectId: 'my-project',
  projectName: 'My Project',
  building_blocks: { /* config */ }
});

// Get file metadata
const metadata = await api.deployments.patterns.terraform.getMetadata(deploymentId);

// Download files
await api.deployments.patterns.terraform.downloadFile(deploymentId, 'main');
await api.deployments.patterns.terraform.downloadFile(deploymentId, 'variables');
await api.deployments.patterns.terraform.downloadFile(deploymentId, 'tfvars');
```

### Display Files in Component

```typescript
import { TerraformViewer } from '../components/TerraformViewer';

export function MyComponent() {
  return (
    <TerraformViewer 
      deploymentId={deploymentId}
      projectName={projectName}
    />
  );
}
```

## Architecture

```
Frontend (React)
    ↓ (api.ts)
Next.js API Route
    ↓ (proxy)
Express Backend (/api/deployments/patterns/submit)
    ↓ (ResolverService)
Resolver API (HTTPS)
    ↓ (generates terraform files)
Response with main.tf, variables.tf, terraform.tfvars
    ↑ (stores in deployment)
Express Backend (stores locally)
    ↑ (retrieves on demand)
Frontend (TerraformViewer displays files)
```

## Deployment States

| Status | resolverStatus | Meaning |
|--------|----------------|---------|
| pending | pending | Waiting for resolver |
| pending | error | Resolver failed |
| resolved | resolved | Files ready |
| deployed | resolved | Infrastructure deployed |

## Error Handling

- **Timeout**: 30 seconds - deployment stays pending
- **Network Error**: Falls back to pending, can retry
- **Invalid Files**: Still returns resolved but logs warnings
- **Missing Project**: Returns 400 error

## Testing Commands

```bash
# Test submission
curl -X POST http://localhost:3001/api/deployments/patterns/submit \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "patternId": "pat-001",
    "projectId": "test",
    "projectName": "Test",
    "building_blocks": {"bucket": {"location": "EU"}}
  }'

# Get metadata
curl http://localhost:3001/api/deployments/dep-xxx/terraform \
  -H "Authorization: Bearer test"

# Download main.tf
curl http://localhost:3001/api/deployments/dep-xxx/terraform/main \
  -H "Authorization: Bearer test" > main.tf
```

## Logging

Enable resolver API debugging:

```bash
DEBUG_RESOLVER=1 npm run dev
```

Logs saved to: `~/.debug_logs/resolver-api-calls.jsonl`

## Performance

- Average resolver response time: ~2-3 seconds
- File retrieval: Instant (cached in memory)
- Timeout: 30 seconds
- Total request size: ~1.5-2 KB
- Response size: ~40-50 KB

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Not found |
| 500 | Server error |
| 503 | Resolver unavailable |

## Next Features

- [ ] Webhook notifications when deployment resolves
- [ ] Polling endpoint for async resolution tracking
- [ ] Terraform validation before returning files
- [ ] Cost breakdown from resolver
- [ ] Git integration for auto-commit
- [ ] Archive download (ZIP or TAR)
- [ ] Terraform module version pinning
