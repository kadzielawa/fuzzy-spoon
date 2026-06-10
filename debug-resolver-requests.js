#!/usr/bin/env node

/**
 * Debug script to intercept and log all requests to resolver API
 * Run this BEFORE starting the backend to see all outgoing requests
 */

const http = require('http');
const https = require('https');

// Intercept HTTPS requests (resolver API uses HTTPS)
const originalFetch = global.fetch;
global.fetch = async function(...args) {
  const [url, options] = args;
  
  if (typeof url === 'string' && url.includes('resolver-api')) {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 RESOLVER API REQUEST');
    console.log('='.repeat(80));
    console.log('URL:', url);
    console.log('Method:', options?.method || 'GET');
    console.log('Headers:', JSON.stringify(options?.headers, null, 2));
    
    if (options?.body) {
      try {
        const body = JSON.parse(options.body);
        console.log('Payload:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Payload:', options.body);
      }
    }
    
    const startTime = Date.now();
    try {
      const response = await originalFetch.apply(this, args);
      const duration = Date.now() - startTime;
      
      console.log('\n✅ RESOLVER API RESPONSE');
      console.log('Status:', response.status, response.statusText);
      console.log('Duration:', duration + 'ms');
      
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      try {
        const responseBody = await clonedResponse.json();
        console.log('Response Body:', JSON.stringify(responseBody, null, 2));
      } catch (e) {
        const text = await clonedResponse.text();
        console.log('Response Body:', text.substring(0, 500));
      }
      
      console.log('='.repeat(80) + '\n');
      
      // Return original response
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log('\n❌ RESOLVER API ERROR');
      console.log('Error:', error.message);
      console.log('Duration:', duration + 'ms');
      console.log('='.repeat(80) + '\n');
      throw error;
    }
  }
  
  return originalFetch.apply(this, args);
};

console.log('✅ Resolver API debugger activated\n');
