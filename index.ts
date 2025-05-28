import express from 'express';
import cors    from 'cors';
import multer  from 'multer';
import path    from 'path';
import fs      from 'fs';

const PORT      = 4000;
const SAVE_DIR  = path.resolve(process.env.HOME!, 'Pictures/cloudSearch');
fs.mkdirSync(SAVE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, SAVE_DIR),
  filename:    (_, file, cb) => {
    const ts  = Date.now();
    const ext = (file.originalname.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
    cb(null, `${ts}_${file.originalname.replace(/\s+/g,'_')}${ext}`);
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(SAVE_DIR));

// Log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('✅  Saved', req.file?.filename);
  res.json({ ok: true, filename: req.file?.filename });
});

app.post('/api/search', (req, res) => {
  const { query } = req.body;
  console.log('🔍 Searching for:', query);
  
  // For now, return mock results
  const results = [
    { image: '🌅', caption: 'Beautiful sunrise over mountains captured during morning hike' },
    { image: '🌺', caption: 'Colorful flowers in the garden during spring bloom' },
    { image: '🦋', caption: 'Butterfly landing on lavender flowers in macro detail' },
    { image: '🌊', caption: 'Ocean waves crashing against rocky coastline at sunset' }
  ];
  
  res.json({ ok: true, results });
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`📂  Server on http://0.0.0.0:${PORT}`));