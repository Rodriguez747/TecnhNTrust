const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_J1gloZUcFQS2@ep-still-truth-a1051s4o-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
	connectionString: DATABASE_URL,
	ssl: { rejectUnauthorized: false }
});

async function initDb() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS risks (
			id BIGSERIAL PRIMARY KEY,
			risk_title TEXT NOT NULL,
			dept TEXT NOT NULL,
			review_date DATE NOT NULL,
			progress INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'on track'
		);
	`);
}

function computeStatus(progress) {
	if (progress >= 80) return 'Ahead';
	if (progress <= 30) return 'At risk';
	return 'on track';
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve static FrontEnd
const staticDir = path.join(__dirname, 'FrontEndnew');
app.use(express.static(staticDir));
app.get('/', (_req, res) => res.redirect('/findings.html'));

// GET all risks
app.get('/risks', async (_req, res) => {
	try {
		const { rows } = await pool.query('SELECT id, risk_title, dept, review_date, progress, status FROM risks ORDER BY id DESC');
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to fetch risks' });
	}
});

// GET a single risk
app.get('/risks/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const { rows, rowCount } = await pool.query('SELECT id, risk_title, dept, review_date, progress, status FROM risks WHERE id = $1', [id]);
		if (rowCount === 0) return res.status(404).json({ error: 'Risk not found' });
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to fetch risk' });
	}
});

// Create a new risk (progress starts at 0%)
app.post('/risks', async (req, res) => {
	try {
		const { risk_title, dept, review_date } = req.body || {};
		if (!risk_title || !dept || !review_date) return res.status(400).json({ error: 'Missing required fields' });
		const progress = 0;
		const status = computeStatus(progress);
		const insert = await pool.query(
			'INSERT INTO risks (risk_title, dept, review_date, progress, status) VALUES ($1,$2,$3,$4,$5) RETURNING id, risk_title, dept, review_date, progress, status',
			[risk_title, dept, review_date, progress, status]
		);
		res.status(201).json(insert.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to create risk' });
	}
});

// Update progress (and status computed server-side if not provided)
app.put('/risks/:id', async (req, res) => {
	try {
		const id = req.params.id;
		let { progress, status } = req.body || {};
		if (typeof progress !== 'number') progress = 0;
		progress = Math.max(0, Math.min(100, Math.round(progress)));
		if (!status) status = computeStatus(progress);
		const upd = await pool.query(
			'UPDATE risks SET progress = $1, status = $2 WHERE id = $3 RETURNING id, risk_title, dept, review_date, progress, status',
			[progress, status, id]
		);
		if (upd.rowCount === 0) return res.status(404).json({ error: 'Risk not found' });
		res.json(upd.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update risk' });
	}
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});

initDb().catch(err => {
	console.error('DB init failed', err);
});