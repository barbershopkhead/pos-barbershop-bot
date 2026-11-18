require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // ⬅️ BARU: proteksi payload berlebihan

// Import routes
const menuRoutes = require('./routes/menu');
const transactionRoutes = require('./routes/transactions');
const expenseRoutes = require('./routes/expenses');

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'POS Barbershop API is running! 🚀' });
});

// ⬅️ BARU: 404 Handler — biar frontend selalu terima JSON, bukan HTML default Express
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.originalUrl}' tidak ditemukan`,
  });
});

// Error handler (HARUS tetap paling bawah)
app.use((err, req, res, next) => {
  console.error('[ERROR]:', err.message);

  // ⬅️ BARU: hormati status code dari error sheets.js, jangan selalu 500
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
