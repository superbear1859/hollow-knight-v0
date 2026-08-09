// Lightweight E2E Test Framework for Hollow Knight Web App

const suites = [];
let currentSuite = null;

export function describe(name, fn) {
  const suite = { name, tests: [], passed: 0, failed: 0, skipped: 0 };
  suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
}

export function test(name, fn) {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be placed inside a describe block.`);
  }
  currentSuite.tests.push({ name, fn });
}

export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    const msg = message ? `${message} | ` : '';
    throw new Error(`${msg}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertNotEquals(actual, expected, message = '') {
  if (actual === expected) {
    const msg = message ? `${message} | ` : '';
    throw new Error(`${msg}Expected NOT to equal ${JSON.stringify(expected)}`);
  }
}

export function assertInDelta(actual, expected, delta = 0.001, message = '') {
  if (Math.abs(actual - expected) > delta) {
    const msg = message ? `${message} | ` : '';
    throw new Error(`${msg}Expected ${expected} ± ${delta}, got ${actual}`);
  }
}

export function assertThrows(fn, message = 'Expected function to throw') {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message);
  }
}

export async function runSuites() {
  console.log('\n==================================================');
  console.log('  HOLLOW KNIGHT WEB APP E2E TEST SUITE RUNNER');
  console.log('==================================================\n');

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const suite of suites) {
    console.log(`\n--------------------------------------------------`);
    console.log(` Suite: ${suite.name}`);
    console.log(`--------------------------------------------------`);

    for (const t of suite.tests) {
      totalTests++;
      const testStart = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - testStart;
        suite.passed++;
        totalPassed++;
        console.log(`  ✓ PASS: ${t.name} (${duration}ms)`);
      } catch (err) {
        const duration = Date.now() - testStart;
        suite.failed++;
        totalFailed++;
        console.log(`  ✗ FAIL: ${t.name} (${duration}ms)`);
        console.log(`    ↳ Error: ${err.message}`);
        if (err.stack) {
          const firstLine = err.stack.split('\n')[1] || '';
          console.log(`      ${firstLine.trim()}`);
        }
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log('\n==================================================');
  console.log('  TEST SUMMARY REPORT');
  console.log('==================================================');
  console.log(`  Total Suites  : ${suites.length}`);
  console.log(`  Total Tests   : ${totalTests}`);
  console.log(`  Passed        : ${totalPassed}`);
  console.log(`  Failed        : ${totalFailed}`);
  console.log(`  Execution Time: ${totalDuration}ms`);
  console.log('==================================================\n');

  return {
    totalSuites: suites.length,
    totalTests,
    totalPassed,
    totalFailed,
    totalDuration,
    suites
  };
}
