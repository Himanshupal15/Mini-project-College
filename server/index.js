const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({ storage });

const app = express();
app.use(cors());
app.use('/uploads', express.static(UPLOAD_DIR));

// Single endpoint to accept multiple files
app.post('/upload', upload.array('files', 20), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  const host = req.get('host');
  const proto = req.protocol;
  const files = req.files.map(f => ({
    name: f.originalname,
    type: f.mimetype,
    url: `${proto}://${host}/uploads/${encodeURIComponent(path.basename(f.filename))}`
  }));
  res.json({ files });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Upload server listening on http://localhost:${PORT}`));
