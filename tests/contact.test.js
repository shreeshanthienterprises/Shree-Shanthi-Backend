const request = require('supertest');

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

process.env.RESEND_API_KEY = 're_test';
process.env.EMAIL_FROM = 'Test <contact@example.com>';
const app = require('../src/app');

const valid = {
  name: 'Asha',
  email: 'asha@example.com',
  service: 'Security services',
  message: 'Need guards <b>urgently</b>',
};

let ip = 0; // distinct client IP per request so the 5/15min limiter doesn't interfere
beforeEach(() => mockSend.mockReset());

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ status: 'ok', emailProvider: 'resend', emailConfigured: true });
  expect(typeof res.body.version).toBe('string');
  expect(JSON.stringify(res.body)).not.toContain('re_test');
});

test('valid payload -> 200, reply_to is the customer, html is escaped', async () => {
  mockSend.mockResolvedValue({ data: { id: 'abc' }, error: null });
  const res = await request(app).post('/api/contact').send(valid);
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  const [payload] = mockSend.mock.calls[0];
  expect(payload.replyTo).toBe('asha@example.com');
  expect(payload.to).toEqual(['shreeshanthienterprises@gmail.com']);
  expect(payload.html).toContain('&lt;b&gt;urgently');
});

test('missing fields -> 400', async () => {
  const res = await request(app).post('/api/contact').send({ name: 'x' });
  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Name, email, service, and message are required.');
  expect(mockSend).not.toHaveBeenCalled();
});

test('invalid email -> 400', async () => {
  const res = await request(app).post('/api/contact').send({ ...valid, email: 'nope' });
  expect(res.status).toBe(400);
});

test('transient provider error is retried then succeeds', async () => {
  mockSend
    .mockResolvedValueOnce({ data: null, error: { statusCode: 500, message: 'boom', name: 'internal' } })
    .mockResolvedValueOnce({ data: { id: 'ok' }, error: null });
  const res = await request(app).post('/api/contact').send(valid);
  expect(res.status).toBe(200);
  expect(mockSend).toHaveBeenCalledTimes(2);
});

test('permanent provider error (4xx) is not retried -> 502', async () => {
  mockSend.mockResolvedValue({ data: null, error: { statusCode: 403, message: 'domain not verified', name: 'validation_error' } });
  const res = await request(app).post('/api/contact').send(valid);
  expect(res.status).toBe(502);
  expect(res.body.success).toBe(false);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

describe('CORS (production)', () => {
  const prev = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = 'production'; });
  afterAll(() => { process.env.NODE_ENV = prev; });
  const preflight = (origin) =>
    request(app).options('/api/contact').set('Origin', origin).set('Access-Control-Request-Method', 'POST');

  test.each(['https://shreeshanthienterprises.com', 'https://www.shreeshanthienterprises.com'])('allows %s', async (o) => {
    const res = await preflight(o);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(o);
  });

  test.each(['https://evil.example.com', 'http://localhost:3000'])('rejects %s', async (o) => {
    const res = await preflight(o);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.status).toBe(403);
  });

  test('no Origin still works', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('phone field', () => {
  test('valid phone is included in the email (html + text)', async () => {
    mockSend.mockResolvedValue({ data: { id: 'p1' }, error: null });
    const res = await request(app).post('/api/contact').set('X-Forwarded-For', `10.9.0.${++ip}`).send({ ...valid, phone: '+91 98765 43210' });
    expect(res.status).toBe(200);
    const [payload] = mockSend.mock.calls[0];
    expect(payload.text).toContain('Phone:    +91 98765 43210');
    expect(payload.html).toContain('tel:+919876543210');
  });

  test('phone is optional', async () => {
    mockSend.mockResolvedValue({ data: { id: 'p2' }, error: null });
    const res = await request(app).post('/api/contact').set('X-Forwarded-For', `10.9.0.${++ip}`).send(valid);
    expect(res.status).toBe(200);
    expect(mockSend.mock.calls[0][0].text).not.toContain('Phone:');
  });

  test.each(['abc', '123', '<script>alert(1)</script>', '1'.repeat(30)])('invalid phone %s -> 400', async (phone) => {
    const res = await request(app).post('/api/contact').set('X-Forwarded-For', `10.9.0.${++ip}`).send({ ...valid, phone });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid phone number.');
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('idempotency key', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const post = () => request(app).post('/api/contact').set('X-Forwarded-For', `10.8.0.${++ip}`).send(valid);

  test('fresh random UUID per submission, reused across retries of the same one', async () => {
    mockSend
      .mockResolvedValueOnce({ data: null, error: { statusCode: 500, message: 'boom', name: 'internal' } })
      .mockResolvedValueOnce({ data: { id: 'a' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'b' }, error: null });
    await post();
    await post();
    const keys = mockSend.mock.calls.map((c) => c[1].idempotencyKey);
    expect(keys).toHaveLength(3);
    keys.forEach((k) => expect(k).toMatch(UUID));
    expect(keys[0]).toBe(keys[1]); // retry of submission 1 reuses its key
    expect(keys[2]).not.toBe(keys[0]); // submission 2 gets a new key
  });
});

describe('sender (from) handling', () => {
  const { resolveFrom } = require('../src/services/emailService');
  const BRACKETED = 'Shree Shanthi Enterprises <contact@shreeshanthienterprises.com>';
  const savedFrom = process.env.EMAIL_FROM;
  const savedName = process.env.EMAIL_FROM_NAME;
  afterEach(() => {
    process.env.EMAIL_FROM = savedFrom;
    if (savedName === undefined) delete process.env.EMAIL_FROM_NAME; else process.env.EMAIL_FROM_NAME = savedName;
  });

  test.each([
    ['name + address without brackets (the production bug)', 'Shree Shanthi Enterprises contact@shreeshanthienterprises.com', undefined, BRACKETED],
    ['already valid Name <email>', BRACKETED, undefined, BRACKETED],
    ['bare address', 'contact@shreeshanthienterprises.com', undefined, 'contact@shreeshanthienterprises.com'],
    ['surrounding spaces and quotes', '  "contact@shreeshanthienterprises.com"  ', undefined, 'contact@shreeshanthienterprises.com'],
    ['brackets but no name', '<contact@shreeshanthienterprises.com>', undefined, 'contact@shreeshanthienterprises.com'],
    ['EMAIL_FROM_NAME builds the bracketed form', 'contact@shreeshanthienterprises.com', 'Shree Shanthi Enterprises', BRACKETED],
    ['EMAIL_FROM_NAME overrides name in EMAIL_FROM', 'Old Name <contact@shreeshanthienterprises.com>', 'Shree Shanthi Enterprises', BRACKETED],
    ['unsafe characters in the name are stripped', 'contact@shreeshanthienterprises.com', 'Evil <x@y.com>\r\nBcc: z', 'Evil x y.com Bcc z <contact@shreeshanthienterprises.com>'],
  ])('%s', (_label, from, name, expected) => {
    expect(resolveFrom({ EMAIL_FROM: from, EMAIL_FROM_NAME: name })).toEqual({ ok: true, from: expected });
  });

  test.each([['', 'EMAIL_FROM is not set'], ['not an email', 'EMAIL_FROM does not contain a valid email address']])(
    'invalid EMAIL_FROM %j is rejected', (from, reason) => {
      expect(resolveFrom({ EMAIL_FROM: from })).toEqual({ ok: false, reason });
    });

  test('a malformed EMAIL_FROM is repaired before it reaches Resend', async () => {
    process.env.EMAIL_FROM = 'Shree Shanthi Enterprises contact@shreeshanthienterprises.com';
    mockSend.mockResolvedValue({ data: { id: 'f1' }, error: null });
    const res = await request(app).post('/api/contact').set('X-Forwarded-For', '10.7.0.1').send(valid);
    expect(res.status).toBe(200);
    expect(mockSend.mock.calls[0][0].from).toBe(BRACKETED);
  });

  test('/health reports emailConfigured:false with a reason when EMAIL_FROM is invalid', async () => {
    process.env.EMAIL_FROM = 'garbage';
    const res = await request(app).get('/health');
    expect(res.body.emailConfigured).toBe(false);
    expect(res.body.emailConfigReason).toBe('EMAIL_FROM does not contain a valid email address');
  });

  test('invalid EMAIL_FROM fails as 500 (misconfigured), not a provider call', async () => {
    process.env.EMAIL_FROM = '';
    const res = await request(app).post('/api/contact').set('X-Forwarded-For', '10.7.0.2').send(valid);
    expect(res.status).toBe(500);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
