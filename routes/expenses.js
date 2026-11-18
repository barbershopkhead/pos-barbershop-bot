const express = require('express');
const router = express.Router();

// Endpoint sementara
router.get('/', (req, res) => {
  res.json({ message: 'Endpoint expenses siap digunakan!' });
});

module.exports = router;
