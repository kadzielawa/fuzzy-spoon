#!/usr/bin/env node

/**
 * Debug Logger - Captures all resolver API interactions
 * Run backend with: DEBUG_RESOLVER=1 npm run dev
 */

import fs from 'fs';
import path from 'path';

const DEBUG_DIR = path.join(process.cwd(), '.debug');
const DEBUG_LOG = path.join(DEBUG_DIR, 'resolver-api-calls.jsonl');

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

interface ResolverAPICall {
  timestamp: string;
  deploymentId?: string;
  projectId?: string;
  request: {
    method: string;
    url: string;
    payloadSize: number;
    timeout: number;
  };
  response: {
    status: number;
    duration: number;
    size: number;
    body: any;
  };
  error?: string;
}

export function logResolverAPICall(call: ResolverAPICall) {
  const line = JSON.stringify(call) + '\n';
  
  // Log to console if DEBUG_RESOLVER env var is set
  if (process.env.DEBUG_RESOLVER === '1') {
    console.log('\n' + '═'.repeat(80));
    console.log('📋 RESOLVER API CALL LOGGED');
    console.log(JSON.stringify(call, null, 2));
    console.log('═'.repeat(80) + '\n');
  }
  
  // Always append to debug log file
  try {
    fs.appendFileSync(DEBUG_LOG, line);
  } catch (error) {
    console.error('[Debug Logger] Failed to write to debug log:', error);
  }
}

export function getDebugLogPath(): string {
  return DEBUG_LOG;
}

export function printDebugSummary() {
  if (!fs.existsSync(DEBUG_LOG)) {
    console.log('No debug logs found');
    return;
  }

  const lines = fs.readFileSync(DEBUG_LOG, 'utf-8').split('\n').filter(l => l);
  const calls: ResolverAPICall[] = lines.map(line => JSON.parse(line));
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESOLVER API CALL SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total calls: ${calls.length}`);
  
  if (calls.length > 0) {
    const successful = calls.filter(c => !c.error && c.response.status < 400).length;
    const failed = calls.filter(c => c.error || c.response.status >= 400).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\nRecent calls:`);
    
    calls.slice(-5).forEach((call, i) => {
      console.log(`\n${i + 1}. ${call.timestamp}`);
      console.log(`   Project: ${call.projectId}`);
      console.log(`   Status: ${call.response.status}`);
      console.log(`   Duration: ${call.response.duration}ms`);
      if (call.error) console.log(`   Error: ${call.error}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

export function clearDebugLog() {
  try {
    if (fs.existsSync(DEBUG_LOG)) {
      fs.unlinkSync(DEBUG_LOG);
      console.log('✅ Debug log cleared');
    }
  } catch (error) {
    console.error('Failed to clear debug log:', error);
  }
}
