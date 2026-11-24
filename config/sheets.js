const { google } = require('googleapis');
const { withRetry } = require('../utils/retry');
require('dotenv').config();

// 1. Ambil dan Validasi SPREADSHEET_ID
const SPREADSHEET_ID   = process.env.SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!SPREADSHEET_ID) {
    throw new Error('[sheets.js] FATAL: SPREADSHEET_ID kosong di .env');
}
if (!CREDENTIALS_PATH) {
    throw new Error('[sheets.js] FATAL: GOOGLE_APPLICATION_CREDENTIALS kosong di .env');
}

// 2. Inisialisasi Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Membaca data dari Google Sheets
 * @param {string} range - Contoh: 'Price_list!A2:B'
 * @returns {Promise<Array<Array<any>>>}
 */
async function readSheet(range) {
  try {
    const response = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    }));
    return response.data.values || [];
  } catch (error) {
    console.error(`[sheets.js] Gagal membaca range "${range}":`, error.message);
    throw error;
  }

}

/**
 * Menambahkan 1 baris baru ke Google Sheets
 * @param {Array<any>} rowData - Array berisi data 1 transaksi
 * @returns {Promise<void>}
 */
async function appendRow(rowData) {
  try {
    const response = await withRetry(() => sheets.spreadsheets.values.append({
  spreadsheetId: SPREADSHEET_ID,
  range: 'Transactions!A:J',
  valueInputOption: 'USER_ENTERED',
  requestBody: {
    values: [rowData],
  },
}));
  } catch (error) {
    console.error('[sheets.js] Gagal menambah baris:', error.message);
    throw error;
  }
}

// 3. Export fungsinya
module.exports = { readSheet, appendRow };
