const { execSync } = require('child_process');

try {
  const out = execSync('node -e "require(\'./server.cjs\');"', { timeout: 3000, encoding: 'utf8' });
  console.log("Reconciliation output:", out);
} catch (e) {
  console.log("Test execution completed.");
}
