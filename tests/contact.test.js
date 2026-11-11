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
