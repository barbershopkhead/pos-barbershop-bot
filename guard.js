// guard.js — cegah submit dobel / spam klik, dengan housekeeping memori
const recentOps = new Map();
const PRUNE_INTERVAL_MS = 60_000;
const MAX_ENTRY_AGE_MS  = 10 * 60_000; // simpan maks. 10 menit

// Bersihkan entri kedaluwarsa tiap 1 menit (unref agar tidak tahan proses mati)
const sweeper = setInterval(() => {
  const cutoff = Date.now() - MAX_ENTRY_AGE_MS;
  for (const [key, ts] of recentOps) {
    if (ts < cutoff) recentOps.delete(key);
  }
}, PRUNE_INTERVAL_MS);
sweeper.unref();

function isSpam(chatId, action, windowMs = 5000) {
  if (typeof chatId !== 'string' || !action) return true; // input aneh = tolak (fail-safe)

  const key = `${chatId}:${action}`;
  const last = recentOps.get(key) || 0;
  const now = Date.now();

  if (now - last < windowMs) return true;

  recentOps.set(key, now);
  return false;
}

module.exports = { isSpam };
