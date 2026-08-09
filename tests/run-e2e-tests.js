#!/usr/bin/env node

import { runSuites } from './test-framework.js';
import './tier1-feature-coverage.test.js';
import './tier2-boundary-corner.test.js';
import './tier3-cross-feature.test.js';
import './tier4-playthrough-scenarios.test.js';

async function main() {
  console.log('Starting Hollow Knight Web App E2E Test Suite Execution...');
  const results = await runSuites();
  
  if (results.totalFailed > 0) {
    console.error(`\n❌ TEST SUITE FAILED: ${results.totalFailed} / ${results.totalTests} tests failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ TEST SUITE PASSED: 100% SUCCESS (${results.totalPassed} / ${results.totalTests} tests passed).`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
