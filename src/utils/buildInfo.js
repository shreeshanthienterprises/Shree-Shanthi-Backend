const { execSync } = require('child_process');
const pkg = require('../../package.json');
const { getEmailConfigStatus } = require('../services/emailService');

// Render exposes the deployed commit as RENDER_GIT_COMMIT. Locally fall back to
// git, then to the package version.
function resolveVersion() {
  if (process.env.RENDER_GIT_COMMIT) return process.env.RENDER_GIT_COMMIT.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return pkg.version;
  }
}

const version = resolveVersion();

// Never include the key itself - only whether it is set.
function healthPayload() {
  const email = getEmailConfigStatus();
  return {
    status: 'ok',
    version,
    emailProvider: 'resend',
    emailConfigured: email.configured,
    ...(email.configured ? {} : { emailConfigReason: email.reason })
  };
}

module.exports = { healthPayload };
