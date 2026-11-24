/**
 * Menjalankan fungsi async dengan retry otomatis.
 * @param {Function} fn - fungsi async yang mau dijalankan
 * @param {number} maxRetries - jumlah percobaan maksimal
 * @param {number} baseDelay - delay awal (ms), dikali 2 tiap percobaan
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * 2 ** (attempt - 1); // 1s → 2s → 4s
      console.warn(`⚠️ Percobaan ${attempt}/${maxRetries} gagal, retry dalam ${delay}ms: ${err.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

module.exports = { withRetry };
