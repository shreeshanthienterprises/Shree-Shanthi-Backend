const PRODUCTION_ORIGINS = [
  'https://shreeshanthienterprises.com',
  'https://www.shreeshanthienterprises.com'
];

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const isProduction = () => process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: function (origin, callback) {
    // Requests with no Origin header (curl, Render health checks, server-to-server)
    if (!origin) return callback(null, true);

    if (PRODUCTION_ORIGINS.includes(origin)) return callback(null, true);

    // Localhost is only allowed outside production
    if (!isProduction() && LOCAL_ORIGIN.test(origin)) return callback(null, true);

    console.warn(`CORS rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = {
  corsOptions
};
