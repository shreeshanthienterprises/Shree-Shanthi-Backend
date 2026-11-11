const { execSync } = require('child_process');
const pkg = require('../../package.json');

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
  return {
    status: 'ok',
    version,
    emailProvider: 'resend',
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
  };
}

module.exports = { healthPayload };
