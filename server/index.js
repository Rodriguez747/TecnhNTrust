const express = require('express');
const path = require('path');
const cors = require('cors');
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
	await pool.query(`
		CREATE TABLE IF NOT EXISTS risk_tasks (
			id BIGSERIAL PRIMARY KEY,
			risk_id BIGINT NOT NULL REFERENCES risks ON DELETE CASCADE,
			label TEXT NOT NULL,
			weight INTEGER NOT NULL,
			done BOOLEAN NOT NULL DEFAULT FALSE
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

// Serve static frontend
const staticDir = path.join(__dirname, '..', 'FrontEndnew');
app.use(express.static(staticDir));
app.get('/', (_req, res) => res.redirect('/findings.html'));

// API routes
app.get('/api/risks', async (_req, res) => {
	try {
		const { rows } = await pool.query('SELECT id, risk_title, dept, review_date, progress, status FROM risks ORDER BY id DESC');
		res.json(rows);
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: 'Failed to fetch risks' });
	}
});

app.get('/api/risks/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const riskResult = await pool.query('SELECT id, risk_title, dept, review_date, progress, status FROM risks WHERE id = $1', [id]);
		if (riskResult.rowCount === 0) return res.status(404).json({ error: 'Not found' });
		const risk = riskResult.rows[0];
		const tasksResult = await pool.query('SELECT id, label, weight, done FROM risk_tasks WHERE risk_id = $1 ORDER BY id ASC', [id]);
		risk.tasks = tasksResult.rows;
		res.json(risk);
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: 'Failed to fetch risk' });
	}
});

app.post('/api/risks', async (req, res) => {
	const client = await pool.connect();
	try {
		const { risk_title, dept, review_date, tasks } = req.body || {};
		if (!risk_title || !dept || !review_date) return res.status(400).json({ error: 'Missing fields' });
		await client.query('BEGIN');
		const insertRisk = await client.query(
			'INSERT INTO risks (risk_title, dept, review_date, progress, status) VALUES ($1,$2,$3,$4,$5) RETURNING id, risk_title, dept, review_date, progress, status',
			[risk_title, dept, review_date, 0, computeStatus(0)]
		);
		const risk = insertRisk.rows[0];
		const items = Array.isArray(tasks) ? tasks : [];
		for (const t of items) {
			await client.query('INSERT INTO risk_tasks (risk_id, label, weight, done) VALUES ($1,$2,$3,$4)', [risk.id, String(t.label || 'Task'), Number(t.weight || 0), false]);
		}
		await client.query('COMMIT');
		res.status(201).json(risk);
	} catch (e) {
		await client.query('ROLLBACK');
		console.error(e);
		res.status(500).json({ error: 'Failed to create risk' });
	} finally {
		client.release();
	}
});

app.put('/api/risks/:id/tasks', async (req, res) => {
	const client = await pool.connect();
	try {
		const id = req.params.id;
		const { tasks } = req.body || {};
		if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });
		await client.query('BEGIN');
		for (const t of tasks) {
			await client.query('UPDATE risk_tasks SET done = $1 WHERE id = $2 AND risk_id = $3', [!!t.done, Number(t.id), id]);
		}
		const sumResult = await client.query('SELECT COALESCE(SUM(weight),0) AS progress FROM risk_tasks WHERE risk_id = $1 AND done = TRUE', [id]);
		const progress = Number(sumResult.rows[0]?.progress || 0);
		const status = computeStatus(progress);
		await client.query('UPDATE risks SET progress = $1, status = $2 WHERE id = $3', [progress, status, id]);
		await client.query('COMMIT');
		res.json({ id: Number(id), progress, status });
	} catch (e) {
		await client.query('ROLLBACK');
		console.error(e);
		res.status(500).json({ error: 'Failed to update tasks' });
	} finally {
		client.release();
	}
});

initDb().then(() => {
	app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => {
	console.error('DB init failed', err);
	process.exit(1);
});