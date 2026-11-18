const express = require('express');
const router = express.Router();
const { appendRow } = require('../config/sheets');

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const { serviceName, finalPrice, capster, paymentMethod, tip, note } = req.body;

    // Validasi
    if (!serviceName) return res.status(400).json({ error: 'serviceName wajib diisi' });
    if (finalPrice === undefined || isNaN(finalPrice) || finalPrice < 0) {
      return res.status(400).json({ error: 'finalPrice harus angka >= 0' });
    }
    if (!capster) return res.status(400).json({ error: 'capster wajib diisi' });
    if (!['CASH', 'QRIS'].includes(paymentMethod?.toUpperCase())) {
      return res.status(400).json({ error: 'paymentMethod: CASH / QRIS' });
    }

    const now = new Date();
    const id = `TRX-${Date.now()}`; // backtick, bukan kutip satu!
    const timestamp = now.toISOString();
    const tanggal = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
    const jam = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

    await appendRow([
      id,
      timestamp,
      tanggal,
      jam,
      serviceName,
      finalPrice,
      capster,
      paymentMethod.toUpperCase(),
      tip ?? 0,
      note ?? ''
    ]);

    return res.status(201).json({
      success: true,
      id,
      message: 'Transaksi berhasil disimpan'
    });
  } catch (err) {
    console.error('[transactions] Gagal menyimpan:', err.message);
    return next(err);
  }
});

module.exports = router;
