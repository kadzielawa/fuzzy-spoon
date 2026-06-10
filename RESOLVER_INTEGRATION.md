# Resolver API Integration Guide

## Overview

The IDP Portal backend now fully integrates with the Terraform Resolver API to generate Terraform configurations from deployment patterns and building blocks. This guide explains how the system works and how to use it from the frontend.

## Architecture

### Deployment Flow

```
User submits pattern deployment
        ↓
/api/deployments/patterns/submit
        ↓
Create deployment record with unique ID
        ↓
Send to Resolver API (/resolve)
        ↓
Resolver returns Terraform files
        ↓
Store files with deployment
        ↓
Return deployment info to user
```

### Key Components

1. **ResolverService** (`backend/src/services/resolverService.ts`)
   - Manages HTTPS communication with resolver API
   - Handles request/response serialization
   - Validates Terraform files
   - Logs all API interactions for debugging

2. **Updated DeploymentRequest Interface**
   - Now includes Terraform files
   - Tracks resolver status (pending/resolved/error)
   - Stores full resolver response with metadata

3. **New API Endpoints**
   - Retrieve deployment info with file sizes
   - Download individual Terraform files
   - Support for both JSON and file downloads

---

## Backend API Endpoints

### 1. Submit Pattern Deployment

**Endpoint:** `POST /api/deployments/patterns/submit`

**Request Body:**
```json
{
  "patternId": "pat-001",
  "projectId": "my-project-dev",
  "projectName": "My Project - Dev",
  "building_blocks": {
    "bucket": {
      "location": "EU",
      "storage_class": "STANDARD",
      "versioning_enabled": false,
      "lifecycle_days_to_delete": 0
    },
    "network": {
      "region": "europe-west3",
      "routing_mode": "REGIONAL",
      "auto_create_subnetworks": false,
      "create_nat": true,
      "ingress_ssh_via_IAP": true
    },
    "iam": {
      "display_name": "Terraform-managed"
    },
    "keys": {
      "region": "europe-west3",
      "key_rotation_period_days": 90
    }
  },
  "estimatedMonthlyCost": 595,
  "environment": "dev",
  "region": "europe-west3"
}
```

**Success Response (200):**
```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "status": "resolved",
  "resolverStatus": "resolved",
  "projectId": "my-project-dev",
  "projectName": "My Project - Dev",
  "message": "Pattern resolved successfully - Terraform files generated",
  "createdBy": "Alice Johnson",
  "timestamp": "2026-06-03T16:32:02.795Z",
  "terraformFiles": {
    "main_tf_size": 8234,
    "variables_tf_size": 15678,
    "terraform_tfvars_size": 1240
  },
  "summary": {
    "building_blocks_requested": ["bucket", "network", "iam", "keys"],
    "building_blocks_resolved": ["bucket", "network", "iam", "keys"],
    "building_blocks_unresolved": [],
    "modules_resolved": ["gcs", "network", "kms", ...],
    "variables_extracted": 70
  }
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields: patternId, projectId, building_blocks"
}
```

### 2. Get Terraform Files Metadata

**Endpoint:** `GET /api/deployments/:deploymentId/terraform`

**Response (200):**
```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "projectId": "my-project-dev",
  "status": "resolved",
  "terraformFiles": {
    "main_tf_size": 8234,
    "variables_tf_size": 15678,
    "terraform_tfvars_size": 1240
  },
  "summary": {
    "building_blocks_requested": [...],
    "modules_resolved": [...]
  }
}
```

### 3. Download main.tf

**Endpoint:** `GET /api/deployments/:deploymentId/terraform/main`

**Response:** Plain text file with `Content-Disposition: attachment`

**Example cURL:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.example.com/api/deployments/dep-xyz/terraform/main \
  -o main.tf
```

### 4. Download variables.tf

**Endpoint:** `GET /api/deployments/:deploymentId/terraform/variables`

**Response:** Plain text file with `Content-Disposition: attachment`

### 5. Download terraform.tfvars

**Endpoint:** `GET /api/deployments/:deploymentId/terraform/tfvars`

**Response:** Plain text file with `Content-Disposition: attachment`

---

## Frontend Integration Examples

### React Hook for Submitting Deployment

```typescript
import { useState } from 'react';

export function useSubmitDeployment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<any>(null);

  const submit = async (payload: {
    patternId: string;
    projectId: string;
    projectName: string;
    building_blocks: Record<string, Record<string, any>>;
    estimatedMonthlyCost?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/deployments/patterns/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit deployment');
      }

      const data = await response.json();
      setDeployment(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error, deployment };
}
```

### Download Terraform Files

```typescript
export async function downloadTerraformFile(
  deploymentId: string,
  fileType: 'main' | 'variables' | 'tfvars'
) {
  const endpoint = `/api/deployments/${deploymentId}/terraform/${fileType}`;
  
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${fileType}.tf`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileType}.tf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

### Display Terraform Files in UI

```typescript
export function TerraformViewer({ deploymentId }: { deploymentId: string }) {
  const [terraformFiles, setTerraformFiles] = useState<{
    main_tf: string;
    variables_tf: string;
    terraform_tfvars: string;
  } | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      const response = await fetch(
        `/api/deployments/${deploymentId}/terraform/main`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const mainTf = await response.text();
        
        // Fetch other files similarly...
        setTerraformFiles({
          main_tf: mainTf,
          variables_tf: '',
          terraform_tfvars: '',
        });
      }
    };

    fetchFiles();
  }, [deploymentId]);

  return (
    <div>
      <h3>Terraform Configuration</h3>
      {terraformFiles && (
        <div>
          <CodeEditor
            value={terraformFiles.main_tf}
            language="hcl"
            readOnly
          />
        </div>
      )}
    </div>
  );
}
```

---

## Resolver API Integration Details

### Resolver Endpoint

- **URL:** `https://resolver-api-479677124022.europe-west2.run.app/resolve`
- **Method:** POST
- **Timeout:** 30 seconds

### Resolver Request Format

```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "status": "pending",
  "payload": {
    "patternId": "pat-001",
    "projectId": "my-project-dev",
    "projectName": "My Project - Dev",
    "building_blocks": { ... },
    "terraform_version": "~> 1.9",
    "backend": "local",
    "modules_ref": "main",
    "estimatedMonthlyCost": 595,
    "createdBy": "user-123",
    "timestamp": "2026-06-03T16:32:02.795Z"
  },
  "message": "Pattern deployment submitted for resolution",
  "createdBy": "Alice Johnson",
  "timestamp": "2026-06-03T16:32:02.795Z"
}
```

### Resolver Response Format

```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "status": "resolved",
  "projectId": "my-project-dev",
  "projectName": "My Project - Dev",
  "main_tf": "terraform { ... }",
  "variables_tf": "variable \"project_id\" { ... }",
  "terraform_tfvars": "project_id = \"my-project-dev\" ...",
  "summary": {
    "building_blocks_requested": ["bucket", "network", ...],
    "building_blocks_resolved": ["bucket", "network", ...],
    "building_blocks_unresolved": [],
    "modules_resolved": ["gcs", "network", "kms", ...],
    "variables_extracted": 70
  }
}
```

---

## Error Handling

### Resolver API Errors

The system handles various error scenarios:

1. **Resolver Timeout**
   - Status: `pending`
   - Message: "Pattern deployment submitted - awaiting resolution"
   - User can retry or check later

2. **Invalid Terraform Files**
   - Status: `resolved`
   - Warning logged but response still returned
   - Check file sizes to verify non-empty

3. **Network Errors**
   - Deployment still created locally
   - Status: `pending`
   - Resolver status: `error`

---

## Debugging

### Enable Resolver API Logging

```bash
# In .env
DEBUG_RESOLVER=1

# Start backend
npm run dev
```

### Check Resolver Logs

The system logs all resolver API calls to:
`~/.debug_logs/resolver-api-calls.jsonl`

Each entry contains:
- deploymentId
- endpoint
- method
- request/response sizes
- status code
- duration
- error messages

### Example Log Entry

```json
{
  "deploymentId": "dep-1780504322795-731ec0dn6",
  "endpoint": "/resolve",
  "method": "POST",
  "requestSize": 1845,
  "responseStatus": 200,
  "responseSizeBytes": 45678,
  "duration": 2341,
  "timestamp": "2026-06-03T16:32:05.123Z",
  "success": true
}
```

---

## Testing

### Test with cURL

```bash
# Submit deployment
curl -X POST http://localhost:3001/api/deployments/patterns/submit \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "patternId": "pat-001",
    "projectId": "test-project",
    "projectName": "Test Project",
    "building_blocks": {
      "bucket": {
        "location": "EU"
      },
      "network": {
        "region": "europe-west3"
      }
    }
  }'

# Get Terraform files info
curl http://localhost:3001/api/deployments/dep-xxx/terraform \
  -H "Authorization: Bearer test-token"

# Download main.tf
curl http://localhost:3001/api/deployments/dep-xxx/terraform/main \
  -H "Authorization: Bearer test-token" \
  -o main.tf
```

---

## Best Practices

1. **Always check deployment status**
   - `resolved`: Files are ready
   - `pending`: Still waiting for resolver
   - Check `resolverStatus` for more detail

2. **Handle file retrieval errors gracefully**
   - Files might not be immediately available
   - Implement retry logic for pending deployments

3. **Cache downloaded files**
   - Store Terraform files locally in the browser
   - Reduce unnecessary downloads

4. **Use metadata endpoint first**
   - Check file sizes before downloading
   - Verify resolution successful via summary

5. **Monitor resolver performance**
   - Log response times
   - Alert if processing exceeds 10 seconds
   - Consider implementing polling for long-running operations

---

## Future Enhancements

1. **Async Resolver Processing**
   - WebSocket support for real-time updates
   - Polling endpoints for deployment status

2. **File Storage**
   - Persist Terraform files to database/cloud storage
   - Generate downloadable archives

3. **Terraform Validation**
   - Run `terraform validate` on generated files
   - Return validation errors

4. **Git Integration**
   - Auto-commit generated files to repository
   - Create pull requests for review

5. **Cost Estimation**
   - Parse resolver response for cost details
   - Display in UI before deployment

---

## Support

For issues or questions:
1. Check the resolver API logs
2. Verify deployment payload format
3. Test individual building blocks
4. Contact the platform team with deployment ID
