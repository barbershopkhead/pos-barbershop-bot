require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

async function testGoogleSheetConnection() {
  // ===== FAIL FAST: Validasi dulu sebelum mencoba koneksi =====
  const missing = [];

  if (!process.env.GOOGLE_SHEET_ID && !process.env.SPREADSHEET_ID) {
    missing.push('SPREADSHEET_ID (masih kosong di .env)');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    missing.push('GOOGLE_APPLICATION_CREDENTIALS');
  }

  if (missing.length > 0) {
    console.error('❌ STOP! Ada masalah di .env:');
    missing.forEach((m) => console.error(`   - ${m}`));
    return;
  }

  const keyFilePath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const spreadsheetId = process.env.SPREADSHEET_ID;

  console.log('✅ Konfigurasi lengkap. Detail:');
  console.log(`   📄 Key file : ${keyFilePath}`);
  console.log(`   🆔 Sheet ID : ${spreadsheetId}\n`);

  try {
    // Auth pakai file JSON (sesuai setup kamu)
    const auth = new google.auth.JWT({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📡 Mencoba membaca data dari Google Sheets...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Price_list!A2:C10', // Sesuaikan dengan nama tab sheet kamu
    });

    const rows = response.data.values;

    if (rows && rows.length > 0) {
      console.log('\n✅ KONEKSI BERHASIL! 🎉');
      console.log(`📦 Total baris terbaca: ${rows.length}`);
      console.log('📋 Contoh baris pertama:', rows[0]);
    } else {
      console.log('\n⚠️ KONEKSI BERHASIL, tapi range kosong. Cek nama tab di sheet kamu.');
    }
  } catch (error) {
    console.error('\n❌ KONEKSI GAGAL!');
    console.error('Pesan Error:', error.message);

    // Diagnosis otomatis biar kamu langsung tau harus ngapain
    if (error.message.includes('ENOENT')) {
      console.error('👉 File JSON tidak ditemukan. Cek path di GOOGLE_APPLICATION_CREDENTIALS.');
    } else if (error.message.includes('permission')) {
      console.error('👉 Bagikan sheet kamu ke email service account (yang ada di file JSON, bagian "client_email") sebagai Editor.');
    } else if (error.message.includes('Unable to parse range')) {
      console.error('👉 Nama tab "Price_list" salah. Cek persis nama tab di Google Sheet kamu.');
    }
  }
}

testGoogleSheetConnection();
