// ============================================================
// server.js — POS Barbershop API + WhatsApp Bot
// ============================================================

// ===== Fail-Fast untuk error yang TIDAK bisa dipulihkan =====
process.on('uncaughtException', (err) => {
  console.error('💥 Fatal (uncaught exception):', err);
  process.exit(1); // state proses sudah corrupt, wajib restart (pm2)
});

// NOTE: unhandledRejection TIDAK mematikan proses.
// Bot kasir harus resilient — error satu operasi tidak boleh
// mematikan seluruh server (kebijakan TUNGGAL, tidak ada duplikat).
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason?.message || reason);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:8080')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Origin tidak diizinkan oleh CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

// Routes
const menuRoutes = require('./routes/menu');
const transactionRoutes = require('./routes/transactions');
const expenseRoutes = require('./routes/expenses');

app.use('/api/menu', menuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check (satu-satunya — jangan didaftarkan ulang di bawah!)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'POS Barbershop API is running! 🚀',
    whatsapp: waReady ? 'connected' : 'disconnected',
  });
});


// 404 Handler — frontend selalu terima JSON
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.originalUrl}' tidak ditemukan`,
  });
});

// Error handler (paling bawah dari semua route)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR] ${status}:`, err.stack || err.message);

  res.status(status).json({
    success: false,
    // Error 4xx = boleh tampilkan, 5xx = pesan generik saja
    message: status < 500 ? err.message : 'Terjadi kesalahan internal',
  });
});


const PORT = process.env.PORT || 8080;

// ==========================================================
// WHATSAPP BOT
// ==========================================================
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const waClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth',
    clientId: 'barbershop-bot',
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  },
});

// Event: QR Code (SATU handler saja)
waClient.on('qr', (qr) => {
  console.log('\n=============================================');
  console.log('SCAN QR CODE INI DARI WHATSAPP DI HP KAMU:');
  console.log('=============================================\n');
  qrcode.generate(qr, { small: true });
});

let waReady = false
waClient.on('ready', () => {
  waReady = true;
  console.log('\n✅ Bot WhatsApp Kasir Barbershop SUDAH SIAP & TERHUBUNG!\n');
});
waClient.on('disconnected', () => { waReady = false; });
waClient.on('auth_failure', (msg) => {
  console.error('❌ Gagal Autentikasi WhatsApp:', msg);
});

waClient.on('message', async (msg) => {
  if (msg.fromMe) return;
  const body = (msg.body || '').trim().toLowerCase();
  if (body === 'ping') {
    try {
      await msg.reply('pong: Kasir barbershop siap melayani 🚀');
    } catch (e) {
      console.error('⚠️ Gagal membalas pesan:', e.message);
    }
  }
});

// Disconnect → exit proses (restart ditangani pm2/start.bat)
waClient.on('disconnected', (reason) => {
  waReady = false;
  console.error('❌ Bot terputus:', reason);
  if (reason === 'LOGOUT') {
    console.error('⚠️ Sesi logout. Hapus folder .wwebjs_auth lalu scan ulang.');
  }
  gracefulShutdown('DISCONNECTED'); // pm2/start.bat yang restart proses baru
});

// ===== TITIK MASUK TUNGGAL initialize() =====
console.log('Memulai inisialisasi WhatsApp Bot...');
waClient.initialize().catch((err) => {
  console.error('💥 Inisialisasi fatal:', err.message);
  process.exit(1);
});

// ============================================================
// START HTTP SERVER + GRACEFUL SHUTDOWN (terpusat)
// ============================================================
const server = app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} sedang dipakai proses lain.`);
    console.error(`   Cari:  netstat -ano | findstr :${PORT}`);
    console.error(`   Kill:  taskkill /f /pid <PID>`);
    process.exit(1);
  } else {
    throw err;
  }
});

let isShuttingDown = false; // taruh di atas function

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;      // anti Ctrl+C ganda
  isShuttingDown = true;
  console.log(`⏳ Menerima ${signal}, mematikan bot...`);

  const forceExit = setTimeout(() => {
    console.warn('⚠️ Shutdown melewati batas waktu, keluar paksa.');
    process.exit(1);
  }, 10000);

  try {
    // Tunggu request lama selesai + drop koneksi keep-alive idle
    const serverClosed = new Promise((resolve) => {
      server.close(() => resolve());
      server.closeIdleConnections?.();
    });

    // Tutup Chromium & release lock sesi
    const clientClosed = waClient.destroy()
      .then(() => console.log('✅ Browser client ditutup dengan bersih.'))
      .catch((e) => console.warn('⚠️ Client sudah tidak aktif:', e.message));

    // Exit HANYA setelah keduanya selesai
    await Promise.all([serverClosed, clientClosed]);

    clearTimeout(forceExit);
    console.log('✅ Shutdown bersih.');
    process.exit(0);
  } catch (e) {
    console.error('💥 Error saat shutdown:', e);
    process.exit(1);
  }
}


process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // pm2 stop
