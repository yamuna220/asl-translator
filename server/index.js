require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const sessionRoutes = require('./routes/sessions');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/signbridge';

const app = express();

app.use(helmet());
const isVercel = !!process.env.VERCEL;
const clientOrigin = process.env.CLIENT_ORIGIN || (isVercel ? true : 'http://localhost:5173');

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sessions', sessionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

// Database Connection
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    let finalUri = MONGODB_URI;

    // Auto-spin up memory server if running locally with localhost connection string
    if (process.env.NODE_ENV !== 'production' && (!process.env.VERCEL) && (MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost'))) {
      try {
        const pkg = 'mongodb-memory-server';
        const { MongoMemoryServer } = require(pkg);
        const mongoServer = await MongoMemoryServer.create();
        finalUri = mongoServer.getUri();
        console.log(`[DEV] Auto-Started In-Memory Database! Test data is temporary.`);
      } catch (err) {
        console.warn('[DEV] Memory server package missing, attempting standard connection.');
      }
    }

    await mongoose.connect(finalUri);
    console.log('MongoDB Connected.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
};
connectDB();

// Only listen on a port if running locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`SignBridge API listening on ${PORT}`);
  });
}

module.exports = app;
