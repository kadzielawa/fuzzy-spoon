/**
 * Resolver Service - Handles integration with the Terraform Resolver API
 * Manages deployment resolution and Terraform file generation
 */

import { logResolverAPICall } from '../debugLogger';
import { curlFetch } from './curlFetch';

/**
 * Deployment payload sent to resolver
 */
export interface ResolverDeploymentPayload {
  deploymentId: string;
  status: string;
  payload: {
    patternId: string;
    projectId: string;
    projectName: string;
    building_blocks: Record<string, Record<string, any>>;
    terraform_version: string;
    backend: string;
    modules_ref: string;
    estimatedMonthlyCost?: number;
    createdBy?: string;
    timestamp: string;
  };
  message: string;
  createdBy: string;
  timestamp: string;
}

/**
 * Terraform files from resolver response
 */
export interface TerraformFiles {
  main_tf: string;
  variables_tf: string;
  terraform_tfvars: string;
}

/**
 * Resolver API response with Terraform files and summary
 */
export interface ResolverResponse extends TerraformFiles {
  deploymentId: string;
  status: string;
  projectId: string;
  projectName: string;
  summary?: {
    building_blocks_requested?: string[];
    building_blocks_resolved?: string[];
    building_blocks_unresolved?: string[];
    modules_resolved?: string[];
    variables_extracted?: number;
    modules_with_fetch_errors?: string[];
  };
  repository?: {
    status: string;
    owner?: string;
    repo?: string;
    error?: string;
  };
}

/**
 * Resolver service for managing API interactions
 */
export class ResolverService {
  private static readonly RESOLVER_URL = 'https://resolver-api-479677124022.europe-west2.run.app/resolve';
  private static readonly TIMEOUT_MS = 60000; // 60 second timeout (resolver fetches GitHub modules)

  /**
   * Submit a deployment to the resolver API using fetch() (proxy-aware via global undici dispatcher)
   */
  static async submitDeployment(payload: ResolverDeploymentPayload): Promise<ResolverResponse> {
    const startTime = Date.now();
    const payloadJson = JSON.stringify(payload);

    try {
      const response = await curlFetch(this.RESOLVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'IDP-Portal-Backend/1.0' },
        body: payloadJson,
        timeoutMs: this.TIMEOUT_MS,
      });

      const duration = Date.now() - startTime;
      const responseText = response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: 'Invalid JSON response', message: responseText };
      }

      logResolverAPICall({
        timestamp: new Date().toISOString(),
        deploymentId: payload.deploymentId,
        request: {
          method: 'POST',
          url: this.RESOLVER_URL + '/resolve',
          payloadSize: Buffer.byteLength(payloadJson),
          timeout: this.TIMEOUT_MS,
        },
        response: {
          status: response.status,
          duration,
          size: Buffer.byteLength(responseText),
          body: responseData,
        },
      });

      if (!response.ok) {
        throw new Error(`Resolver API returned ${response.status}: ${responseData.detail || responseData.message || 'Unknown error'}`);
      }

      return responseData as ResolverResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      logResolverAPICall({
        timestamp: new Date().toISOString(),
        deploymentId: payload.deploymentId,
        request: {
          method: 'POST',
          url: this.RESOLVER_URL + '/resolve',
          payloadSize: Buffer.byteLength(payloadJson),
          timeout: this.TIMEOUT_MS,
        },
        response: {
          status: 0,
          duration,
          size: 0,
          body: null,
        },
        error: errorMsg,
      });

      throw error;
    }
  }

  /**
   * Extract Terraform files from resolver response
   */
  static extractTerraformFiles(response: ResolverResponse): TerraformFiles {
    return {
      main_tf: response.main_tf || '',
      variables_tf: response.variables_tf || '',
      terraform_tfvars: response.terraform_tfvars || '',
    };
  }

  /**
   * Validate resolver response has all required Terraform files
   */
  static validateTerraformFiles(response: ResolverResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!response.main_tf) {
      errors.push('Missing main.tf in resolver response');
    }
    if (!response.variables_tf) {
      errors.push('Missing variables.tf in resolver response');
    }
    if (!response.terraform_tfvars) {
      errors.push('Missing terraform.tfvars in resolver response');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format resolver response for API response
   */
  static formatResolverResponse(response: ResolverResponse) {
    return {
      deploymentId: response.deploymentId,
      status: response.status,
      projectId: response.projectId,
      projectName: response.projectName,
      terraformFiles: this.extractTerraformFiles(response),
      summary: response.summary,
      repository: response.repository,
    };
  }

  /**
   * Get Terraform file sizes
   */
  static getTerraformFileSizes(files: TerraformFiles) {
    return {
      main_tf_bytes: Buffer.byteLength(files.main_tf, 'utf-8'),
      variables_tf_bytes: Buffer.byteLength(files.variables_tf, 'utf-8'),
      terraform_tfvars_bytes: Buffer.byteLength(files.terraform_tfvars, 'utf-8'),
      total_bytes: 
        Buffer.byteLength(files.main_tf, 'utf-8') +
        Buffer.byteLength(files.variables_tf, 'utf-8') +
        Buffer.byteLength(files.terraform_tfvars, 'utf-8'),
    };
  }
}
