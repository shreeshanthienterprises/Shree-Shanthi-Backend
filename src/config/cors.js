const corsOptions = {
  origin: function (origin, callback) {
    console.log(`CORS checking origin: ${origin}`);
    
    // In development, allow all origins for easier debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`CORS allowing origin (development mode): ${origin}`);
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [
      'https://www.afcofficial.in',
      'https://afcofficial.in',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3005',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://localhost:3002',
      'https://localhost:3005'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS allowing request with no origin');
      return callback(null, true);
    }
    
    // Always allow localhost origins for development
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      console.log(`CORS allowing localhost origin: ${origin}`);
      return callback(null, true);
    }
    
    // For production, temporarily allow all origins until we configure the frontend properly
    if (process.env.NODE_ENV === 'production') {
      console.log(`CORS allowing origin (production mode): ${origin}`);
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS allowing whitelisted origin: ${origin}`);
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      console.log(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = {
  corsOptions
};