require('dotenv').config();
const path = require('path');
const express = require('express');
const app = require('./api/index.js'); // Import Vercel Serverless Function

const PORT = process.env.PORT || 5000;

// Initiate background Cron Services (YouTube Fetcher) for Local
const youtubeService = require('./services/youtube');
(async () => {
  try {
    const connectDB = require('./db');
    await connectDB();
    await youtubeService.initCronJobs();
  } catch (err) {
    console.error('Failed to initialize YouTube Cron Jobs:', err);
  }
})();

// ─── Serve Vite build in production locally ───
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'))
  );
}

app.listen(PORT, () => {
  console.log(`\n🟣 KIRA API running → http://localhost:${PORT}\n`);
});
