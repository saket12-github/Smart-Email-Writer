// Load environment variables first — before any other require
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files from the public folder
app.use(express.static('public'));

// API routes
app.use('/api', emailRoutes);

// Global error handler — Express identifies this by the 4-argument signature
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
