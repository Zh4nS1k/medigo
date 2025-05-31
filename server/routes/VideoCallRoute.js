const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');

router.post('/api/call-log', async (req, res) => {
  try {
    const { roomId, participants, endedAt } = req.body;
    const log = await CallLog.create({ roomId, participants, endedAt });
    res.json({ message: 'success', log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
