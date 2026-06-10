/**
 * Resolver Service - Handles integration with the Terraform Resolver API
 * Manages deployment resolution and Terraform file generation
 */

import https from 'https';
import { logResolverAPICall } from '../debugLogger';

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
  private static readonly RESOLVER_API_HOST = 'resolver-api-479677124022.europe-west2.run.app';
  private static readonly RESOLVER_API_PORT = 443;
  private static readonly RESOLVER_API_PATH = '/resolve';
  private static readonly TIMEOUT_MS = 30000; // 30 second timeout for resolver

  /**
   * Submit a deployment to the resolver API
   */
  static async submitDeployment(payload: ResolverDeploymentPayload): Promise<ResolverResponse> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const payloadJson = JSON.stringify(payload);
      const contentLength = Buffer.byteLength(payloadJson);

      const options = {
        hostname: this.RESOLVER_API_HOST,
        port: this.RESOLVER_API_PORT,
        path: this.RESOLVER_API_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': contentLength,
          'User-Agent': 'IDP-Portal-Backend/1.0',
        },
      };

      const timeoutId = setTimeout(() => {
        request.destroy();
        const error = new Error(`Resolver API timeout after ${this.TIMEOUT_MS}ms`);
        logResolverAPICall({
          deploymentId: payload.deploymentId,
          endpoint: this.RESOLVER_API_PATH,
          method: 'POST',
          requestSize: contentLength,
          responseStatus: 0,
          responseSizeBytes: 0,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: error.message,
        });
        reject(error);
      }, this.TIMEOUT_MS);

      const request = https.request(options, (response) => {
        clearTimeout(timeoutId);
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const duration = Date.now() - startTime;
          let responseData: any;

          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = { error: 'Invalid JSON response', message: data };
          }

          // Log resolver API call for debugging
          logResolverAPICall({
            deploymentId: payload.deploymentId,
            endpoint: this.RESOLVER_API_PATH,
            method: 'POST',
            requestSize: contentLength,
            responseStatus: response.statusCode || 0,
            responseSizeBytes: Buffer.byteLength(data),
            duration,
            timestamp: new Date().toISOString(),
            success: (response.statusCode === 200 || response.statusCode === 201),
          });

          if (response.statusCode === 200 || response.statusCode === 201) {
            resolve(responseData as ResolverResponse);
          } else {
            const error = new Error(
              `Resolver API returned ${response.statusCode}: ${responseData.message || 'Unknown error'}`
            );
            reject(error);
          }
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        logResolverAPICall({
          deploymentId: payload.deploymentId,
          endpoint: this.RESOLVER_API_PATH,
          method: 'POST',
          requestSize: contentLength,
          responseStatus: 0,
          responseSizeBytes: 0,
          duration,
          timestamp: new Date().toISOString(),
          error: error.message,
        });
        reject(error);
      });

      request.write(payloadJson);
      request.end();
    });
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
