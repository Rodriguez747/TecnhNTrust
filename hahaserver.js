const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// DIRECT connection to Neon database (no .env)
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_J1gloZUcFQS2@ep-still-truth-a1051s4o-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// File upload directory setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${unique}-${file.originalname}`);
    }
  })
});

// Upload document
app.post('/upload', upload.single('file'), async (req, res) => {
  const { document_name, owner_dept } = req.body;
  const file = req.file;

  try {
    const result = await pool.query(
      `INSERT INTO policy_documents
       (document_name, owner_dept, approval_status, last_review, document_approved, file_data, file_name)
       VALUES ($1, $2, 'Pending', NULL, NULL, $3, $4)
       RETURNING document_id`,
      [document_name, owner_dept, file ? fs.readFileSync(file.path) : null, file ? file.originalname : null]
    );

    res.status(201).json({ document_id: result.rows[0].document_id });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all documents
app.get('/documents', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT document_id, document_name, owner_dept, approval_status, last_review, document_approved
      FROM policy_documents ORDER BY document_name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get one document
app.get('/document/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT document_id, document_name, owner_dept, approval_status, last_review, document_approved, file_name
      FROM policy_documents WHERE document_id = $1
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download file
app.get('/download/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT file_data, file_name FROM policy_documents WHERE document_id = $1`,
      [req.params.id]
    );

    if (!rows.length || !rows[0].file_data) return res.status(404).send('File not found');

    res.setHeader('Content-Disposition', `attachment; filename="${rows[0].file_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(rows[0].file_data);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
