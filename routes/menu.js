const express = require('express');
const router = express.Router();
const { readSheet } = require('../config/sheets');

// Konstanta range — biar tidak "magic string" berulang
const MENU_RANGE = 'Price_List!A2:B'; // ← SATU string, pakai backtick/tanda kutip biasa

// GET /api/menu
router.get('/', async (req, res, next) => {
  try {
    const rows = await readSheet(MENU_RANGE);

    // Guard: sheet kosong / tidak ada baris data
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const menu = rows
      .filter(row => row[0]) // buang baris kosong (nama layanan wajib ada)
      .map(row => ({
        name: String(row[0]).trim(),
        defaultPrice: parseRupiah(row[1])
      }));

    return res.json({ success: true, data: menu });
  } catch (err) {
    console.error('[menu] Gagal membaca Price_List:', err.message);
    return next(err);
  }
});

// Helper: "Rp 50.000" → 50000 (lebih tahan banting daripada replace doang)
function parseRupiah(value) {
  if (value === null || value === undefined || value === '') return 0;

  // Kalau dari Sheets sudah berupa angka murni, pakai langsung
  if (typeof value === 'number') return value;

  const cleaned = String(value).replace(/[^\d]/g, ''); // buang titik, koma, "Rp", spasi
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

module.exports = router;
