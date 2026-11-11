const crypto = require('crypto');
const { Resend } = require('resend');

// Provider-specific code lives in this file only. To swap providers, replace
// `sendOnce` (and the client setup) and keep the public `sendContactEmail` API.

const DEFAULT_EMAIL_TO = 'shreeshanthienterprises@gmail.com';
const OVERALL_TIMEOUT_MS = 15000; // hard cap for the whole send, retries included
const MAX_RETRIES = 2; // retries after the first attempt (3 attempts total)
const BACKOFF_MS = [500, 1000];

class EmailError extends Error {
  constructor(message, { retryable = false, code, status } = {}) {
    super(message);
    this.name = 'EmailError';
    this.retryable = retryable;
    this.code = code;
    this.status = status; // HTTP status from the provider, when known
  }
}

let client;
function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new EmailError('RESEND_API_KEY is not configured', { code: 'not_configured' });
  }
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimestamp(date = new Date()) {
  return `${date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true,
  })} IST`;
}

function singleLine(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function generateEmailHTML(data, submittedAt) {
  const row = (label, value) => `
            <tr>
              <td style="color:#888;font-weight:bold;padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap;">${label}</td>
              <td style="padding:8px 0;">${value}</td>
            </tr>`;
  const email = escapeHtml(data.email);
  return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:8px;overflow:hidden;">
        <div style="background:#e53935;color:#fff;padding:24px 32px;text-align:center;">
          <h2 style="margin:0;font-size:26px;font-weight:700;">Shree Shanthi Enterprises</h2>
          <p style="margin:8px 0 0;font-size:16px;">New Contact Form Submission</p>
        </div>
        <div style="background:#fff;padding:32px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${row('Name', escapeHtml(data.name))}
            ${row('Email', `<a href="mailto:${email}">${email}</a>`)}
            ${data.phone ? row('Phone', `<a href="tel:${escapeHtml(data.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(data.phone)}</a>`) : ''}
            ${row('Service', escapeHtml(data.service))}
            ${row('Received', escapeHtml(submittedAt))}
          </table>
          <h3 style="color:#e53935;margin:0 0 8px;">Message</h3>
          <div style="background:#f4f8ff;border-radius:4px;padding:16px;color:#333;font-size:15px;line-height:1.6;">
            ${escapeHtml(data.message).replace(/\r?\n/g, '<br>')}
          </div>
          <p style="color:#888;font-size:13px;margin:24px 0 0;">Reply to this email to respond directly to the customer.</p>
        </div>
        <div style="background:#1a237e;color:#fff;padding:16px 32px;text-align:center;font-size:13px;">
          Housekeeping &bull; Security &bull; Pest Control
        </div>
      </div>`;
}

function generateEmailText(data, submittedAt) {
  return [
    'SHREE SHANTHI ENTERPRISES - NEW CONTACT FORM SUBMISSION',
    '========================================================',
    `Name:     ${data.name}`,
    `Email:    ${data.email}`,
    ...(data.phone ? [`Phone:    ${data.phone}`] : []),
    `Service:  ${data.service}`,
    `Received: ${submittedAt}`,
    '',
    'Message:',
    '--------',
    data.message,
    '',
    'Reply to this email to respond directly to the customer.',
  ].join('\n');
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

// Resolve/reject with `promise`, but reject immediately if `signal` aborts.
function raceAbort(promise, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function isRetryableStatus(status) {
  return status === undefined || status === null || status === 408 || status === 429 || status >= 500;
}

// One attempt against the provider. Throws EmailError on failure.
async function sendOnce(payload, idempotencyKey) {
  let result;
  try {
    result = await getClient().emails.send(payload, { idempotencyKey });
  } catch (err) {
    if (err instanceof EmailError) throw err;
    // Network-level failure (DNS, reset, etc.)
    throw new EmailError(err.message || 'Network error', { retryable: true, code: err.code });
  }
  if (result && result.error) {
    const { statusCode, message, name } = result.error;
    throw new EmailError(message || name || 'Email provider error', {
      retryable: isRetryableStatus(statusCode),
      code: name || statusCode,
      status: statusCode,
    });
  }
  return { id: result && result.data && result.data.id };
}

/**
 * Send the contact-form notification email.
 * Resolves with { id } on success; rejects with EmailError after the retries
 * are exhausted or the overall timeout fires. When it settles, no further
 * provider calls are started.
 */
async function sendContactEmail(data) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new EmailError('EMAIL_FROM is not configured', { code: 'not_configured' });
  const to = (process.env.EMAIL_TO || DEFAULT_EMAIL_TO).split(',').map((s) => s.trim()).filter(Boolean);

  const submittedAt = formatTimestamp();
  const payload = {
    from,
    to,
    replyTo: data.email,
    subject: `New enquiry from ${singleLine(data.name)} [${singleLine(data.service)}]`,
    html: generateEmailHTML(data, submittedAt),
    text: generateEmailText(data, submittedAt),
  };
  // Same key across retries so a retried send can never deliver a duplicate.
  // A fresh random UUID per submission, reused only for retries of THIS submission.
  const idempotencyKey = crypto.randomUUID();

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new EmailError(`Email send timed out after ${OVERALL_TIMEOUT_MS / 1000}s`, { code: 'timeout' })),
    OVERALL_TIMEOUT_MS
  );
  const { signal } = controller;

  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await raceAbort(sendOnce(payload, idempotencyKey), signal);
      } catch (err) {
        if (signal.aborted) throw signal.reason;
        if (!(err instanceof EmailError) || !err.retryable || attempt >= MAX_RETRIES) throw err;
        await sleep(BACKOFF_MS[attempt] || 1000, signal);
      }
    }
  } finally {
    clearTimeout(timer);
    // Make sure nothing keeps going after we settle (e.g. a pending backoff).
    if (!signal.aborted) controller.abort(new EmailError('Email send finished', { code: 'finished' }));
  }
}

module.exports = { sendContactEmail, EmailError, escapeHtml };
