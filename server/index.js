import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb as readJsonDb, writeDb as writeJsonDb } from './dbStore.js';
import { initMysql, isMysqlConnected, readDbFromMysql, pool } from './dbMysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve Static Production Frontend Build
app.use(express.static(path.resolve(__dirname, '../dist')));

// Lazy MySQL initialization for Vercel Serverless
let mysqlInitialized = false;
async function ensureMysql() {
  if (!isMysqlConnected() && !mysqlInitialized) {
    mysqlInitialized = true;
    await initMysql();
  }
}

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    await ensureMysql();
  }
  next();
});

// Unified Data Access Layer (MySQL + Fallback JSON)
async function getDb() {
  if (isMysqlConnected()) {
    const data = await readDbFromMysql();
    if (data) return data;
  }
  return await readJsonDb();
}

// Helper Calculate Age
function getAge(birthDateStr) {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

// Helper Age Grouping (Disesuaikan kebutuhan Klinik)
function getAgeGroup(birthDateStr) {
  if (!birthDateStr) return '20–44 th';
  const today = new Date();
  const birth = new Date(birthDateStr);
  const diffTime = today - birth;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays <= 7) return '0–7 hr';
  if (diffDays >= 8 && diffDays <= 20) return '8–20 hr';

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) {
    months--;
  }

  if (months >= 1 && months <= 11 && diffDays > 20) return '1–11 bln';

  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    years--;
  }
  if (years < 0) years = 0;

  if (years >= 1 && years <= 4) return '1–4 th';
  if (years >= 5 && years <= 9) return '5–9 th';
  if (years >= 10 && years <= 14) return '10–14 th';
  if (years >= 15 && years <= 19) return '15–19 th';
  if (years >= 20 && years <= 44) return '20–44 th';
  if (years >= 44 && years <= 60) return '44–60 th';
  return '>60 th';
}

// Generate No. RM (RM-YYYY-XXXX)
async function generateNoRM(db) {
  const year = new Date().getFullYear();
  const prefix = `RM-${year}-`;
  const matched = db.pasien.filter(p => p.no_rm && p.no_rm.startsWith(prefix));
  if (matched.length === 0) return `${prefix}0001`;

  const lastNum = matched.reduce((max, p) => {
    const parts = p.no_rm.split('-');
    const num = parseInt(parts[2], 10) || 0;
    return num > max ? num : max;
  }, 0);

  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
}

// Generate No. Registrasi Kunjungan (REG-YYYYMMDD-XXX)
async function generateNoRegistrasi(db, tanggalKunjungan) {
  const dateObj = new Date(tanggalKunjungan || Date.now());
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `REG-${dateStr}-`;

  const matched = db.kunjungan.filter(k => k.no_registrasi && k.no_registrasi.startsWith(prefix));
  if (matched.length === 0) return `${prefix}001`;

  const lastNum = matched.reduce((max, k) => {
    const parts = k.no_registrasi.split('-');
    const num = parseInt(parts[2], 10) || 0;
    return num > max ? num : max;
  }, 0);

  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

// ==================== REAL-TIME ENGINE ====================
let sseClients = [];
let lastDataUpdateTimestamp = Date.now();

function broadcastDataChange(action = 'MUTATION', data = {}) {
  lastDataUpdateTimestamp = Date.now();
  const payload = JSON.stringify({ type: 'DATA_CHANGED', action, data, timestamp: lastDataUpdateTimestamp });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      // Ignore write errors
    }
  });
}

app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

app.get('/api/realtime/status', (req, res) => {
  res.json({
    success: true,
    lastUpdate: lastDataUpdateTimestamp,
    activeClients: sseClients.length
  });
});

// ==================== API STATUS DATABASE ====================

app.get('/api/database-status', (req, res) => {
  res.json({
    success: true,
    engine: isMysqlConnected() ? 'MySQL / MariaDB Database' : 'Local JSON Persisted File',
    is_mysql: isMysqlConnected(),
    database_name: isMysqlConnected() ? (process.env.MYSQL_DB || 'klinik_jati_asih_medika') : 'klinik_db.json'
  });
});

// ==================== API MASTER ====================

app.get('/api/master', async (req, res) => {
  try {
    const db = await getDb();
    const dokterEnriched = db.dokter.map(d => {
      const p = db.poli.find(item => item.id === d.poli_id);
      return { ...d, nama_poli: p ? p.nama_poli : '' };
    });
    res.json({ success: true, poli: db.poli, dokter: dokterEnriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== API PASIEN ====================

app.get('/api/pasien', async (req, res) => {
  try {
    const { search } = req.query;
    const db = await getDb();
    let result = db.pasien;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.nama && p.nama.toLowerCase().includes(q)) ||
        (p.no_rm && p.no_rm.toLowerCase().includes(q)) ||
        (p.nik && p.nik.includes(q))
      );
    }

    res.json({ success: true, data: result.sort((a, b) => b.id - a.id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Pasien Baru (REQ-01)
app.post('/api/pasien', async (req, res) => {
  try {
    const { nama, nik, no_bpjs, tanggal_lahir, jenis_kelamin } = req.body;

    if (!nama || !tanggal_lahir || !jenis_kelamin) {
      return res.status(400).json({ success: false, message: 'Nama, Tanggal Lahir, dan Jenis Kelamin wajib diisi.' });
    }

    const db = await getDb();
    const no_rm = await generateNoRM(db);

    // Cek Unik No. RM
    if (db.pasien.some(p => p.no_rm.toLowerCase() === no_rm.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Nomor Rekam Medis (No. RM) sudah terdaftar.' });
    }

    let newPasien = null;

    if (isMysqlConnected() && pool) {
      const [resInsert] = await pool.query(
        'INSERT INTO pasien (no_rm, nama, nik, no_bpjs, tanggal_lahir, jenis_kelamin, alamat, no_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [no_rm, nama, nik || '', no_bpjs || '', tanggal_lahir, jenis_kelamin, '', '']
      );
      newPasien = {
        id: resInsert.insertId,
        no_rm,
        nama,
        nik: nik || '',
        no_bpjs: no_bpjs || '',
        tanggal_lahir,
        jenis_kelamin,
        alamat: '',
        no_hp: ''
      };
    } else {
      const maxId = db.pasien.reduce((max, p) => (p.id > max ? p.id : max), 0);
      newPasien = {
        id: maxId + 1,
        no_rm,
        nama,
        nik: nik || '',
        no_bpjs: no_bpjs || '',
        tanggal_lahir,
        jenis_kelamin,
        alamat: '',
        no_hp: '',
        created_at: new Date().toISOString()
      };
      db.pasien.push(newPasien);
      await writeJsonDb(db);
    }

    res.status(201).json({ success: true, data: newPasien, message: 'Pasien baru berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== API KUNJUNGAN ====================

app.get('/api/kunjungan', async (req, res) => {
  try {
    const { start_date, end_date, penjamin, status_pasien, poli_id, search } = req.query;
    const db = await getDb();

    let visits = db.kunjungan.map(k => {
      const pasien = db.pasien.find(p => p.id === Number(k.pasien_id)) || {};
      const poli = db.poli.find(pl => pl.id === Number(k.poli_id)) || {};
      const dokter = db.dokter.find(d => d.id === Number(k.dokter_id)) || {};
      const age = getAge(pasien.tanggal_lahir);

      return {
        ...k,
        nama_pasien: pasien.nama || 'Pasien Terhapus',
        no_rm: pasien.no_rm || '',
        nik: pasien.nik || '',
        no_bpjs: pasien.no_bpjs || '',
        tanggal_lahir: pasien.tanggal_lahir || '',
        jenis_kelamin: pasien.jenis_kelamin || 'L',
        alamat: pasien.alamat || '',
        no_hp: pasien.no_hp || '',
        nama_poli: poli.nama_poli || '',
        nama_dokter: dokter.nama_dokter || '',
        usia: age,
        rentang_usia: getAgeGroup(pasien.tanggal_lahir)
      };
    });

    if (start_date) {
      visits = visits.filter(v => v.tanggal_kunjungan >= start_date);
    }
    if (end_date) {
      visits = visits.filter(v => v.tanggal_kunjungan <= end_date);
    }
    if (penjamin) {
      visits = visits.filter(v => v.penjamin === penjamin);
    }
    if (status_pasien) {
      visits = visits.filter(v => v.status_pasien === status_pasien);
    }
    if (poli_id) {
      visits = visits.filter(v => v.poli_id === Number(poli_id));
    }
    if (search) {
      const q = search.toLowerCase();
      visits = visits.filter(v =>
        v.nama_pasien.toLowerCase().includes(q) ||
        v.no_rm.toLowerCase().includes(q) ||
        v.no_registrasi.toLowerCase().includes(q)
      );
    }

    visits.sort((a, b) => b.id - a.id);
    res.json({ success: true, data: visits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Tambah Kunjungan (REQ-02 & REQ-03 Pasien Baru dan Lama)
app.post('/api/kunjungan', async (req, res) => {
  try {
    const { pasien_id, tanggal_kunjungan, poli_id, dokter_id, penjamin, no_kartu_penjamin, tindakan, catatan } = req.body;

    if (!pasien_id || !poli_id || !dokter_id || !penjamin) {
      return res.status(400).json({ success: false, message: 'Pasien, Poli, Dokter, dan Penjamin wajib diisi.' });
    }

    const db = await getDb();
    const pid = Number(pasien_id);

    const tgl = tanggal_kunjungan || new Date().toISOString().split('T')[0];
    const wkt = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // REQ-03: Cek apakah pasien sudah punya kunjungan sebelumnya
    const priorVisitsCount = db.kunjungan.filter(k => Number(k.pasien_id) === pid).length;
    const status_pasien = priorVisitsCount > 0 ? 'Lama' : 'Baru';

    const no_registrasi = await generateNoRegistrasi(db, tgl);
    let newKunjungan = null;

    if (isMysqlConnected() && pool) {
      const [resInsert] = await pool.query(
        'INSERT INTO kunjungan (no_registrasi, tanggal_kunjungan, waktu_kunjungan, pasien_id, status_pasien, poli_id, dokter_id, penjamin, no_kartu_penjamin, tindakan, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [no_registrasi, tgl, wkt, pid, status_pasien, Number(poli_id), Number(dokter_id), penjamin, no_kartu_penjamin || '', tindakan || '', catatan || '']
      );
      newKunjungan = {
        id: resInsert.insertId,
        no_registrasi,
        tanggal_kunjungan: tgl,
        waktu_kunjungan: wkt,
        pasien_id: pid,
        status_pasien,
        poli_id: Number(poli_id),
        dokter_id: Number(dokter_id),
        penjamin,
        no_kartu_penjamin: no_kartu_penjamin || '',
        tindakan: tindakan || '',
        catatan: catatan || ''
      };
    } else {
      const maxId = db.kunjungan.reduce((max, k) => (k.id > max ? k.id : max), 0);
      newKunjungan = {
        id: maxId + 1,
        no_registrasi,
        tanggal_kunjungan: tgl,
        waktu_kunjungan: wkt,
        pasien_id: pid,
        status_pasien,
        poli_id: Number(poli_id),
        dokter_id: Number(dokter_id),
        penjamin,
        no_kartu_penjamin: no_kartu_penjamin || '',
        tindakan: tindakan || '',
        catatan: catatan || '',
        created_at: new Date().toISOString()
      };
      db.kunjungan.push(newKunjungan);
      await writeJsonDb(db);
    }

    broadcastDataChange('CREATE_KUNJUNGAN', newKunjungan);

    res.status(201).json({
      success: true,
      message: `Kunjungan berhasil dicatat sebagai Pasien ${status_pasien}.`,
      no_registrasi,
      status_pasien,
      kunjungan: newKunjungan
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Edit / Perbaiki Data Kunjungan (REQ-04)
app.put('/api/kunjungan/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = await getDb();
    const visit = db.kunjungan.find(k => k.id === id);

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Data kunjungan tidak ditemukan.' });
    }

    const body = req.body;
    const updatedVisit = {
      tanggal_kunjungan: body.tanggal_kunjungan || visit.tanggal_kunjungan,
      waktu_kunjungan: body.waktu_kunjungan || visit.waktu_kunjungan,
      poli_id: body.poli_id ? Number(body.poli_id) : visit.poli_id,
      dokter_id: body.dokter_id ? Number(body.dokter_id) : visit.dokter_id,
      penjamin: body.penjamin || visit.penjamin,
      no_kartu_penjamin: body.no_kartu_penjamin !== undefined ? body.no_kartu_penjamin : visit.no_kartu_penjamin,
      tindakan: body.tindakan !== undefined ? body.tindakan : visit.tindakan,
      catatan: body.catatan !== undefined ? body.catatan : visit.catatan,
      status_pasien: body.status_pasien || visit.status_pasien
    };

    // Update Nama Pasien if provided
    if (body.nama_pasien && visit.pasien_id) {
      const pid = Number(visit.pasien_id);
      if (isMysqlConnected() && pool) {
        await pool.query('UPDATE pasien SET nama = ? WHERE id = ?', [body.nama_pasien.trim(), pid]);
      } else {
        const pIdx = db.pasien.findIndex(p => p.id === pid);
        if (pIdx !== -1) {
          db.pasien[pIdx].nama = body.nama_pasien.trim();
        }
      }
    }

    if (isMysqlConnected() && pool) {
      await pool.query(
        'UPDATE kunjungan SET tanggal_kunjungan = ?, waktu_kunjungan = ?, poli_id = ?, dokter_id = ?, penjamin = ?, no_kartu_penjamin = ?, tindakan = ?, catatan = ?, status_pasien = ? WHERE id = ?',
        [
          updatedVisit.tanggal_kunjungan,
          updatedVisit.waktu_kunjungan,
          updatedVisit.poli_id,
          updatedVisit.dokter_id,
          updatedVisit.penjamin,
          updatedVisit.no_kartu_penjamin,
          updatedVisit.tindakan,
          updatedVisit.catatan,
          updatedVisit.status_pasien,
          id
        ]
      );
    } else {
      const idx = db.kunjungan.findIndex(k => k.id === id);
      db.kunjungan[idx] = { ...db.kunjungan[idx], ...updatedVisit };
      await writeJsonDb(db);
    }

    broadcastDataChange('UPDATE_KUNJUNGAN', { id });

    res.json({ success: true, message: 'Data kunjungan berhasil diperbaiki.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE Kunjungan
app.delete('/api/kunjungan/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isMysqlConnected() && pool) {
      await pool.query('DELETE FROM kunjungan WHERE id = ?', [id]);
    } else {
      const db = await getDb();
      db.kunjungan = db.kunjungan.filter(k => k.id !== id);
      await writeJsonDb(db);
    }

    broadcastDataChange('DELETE_KUNJUNGAN', { id });

    res.json({ success: true, message: 'Data kunjungan berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== API REKAPITULASI & LAPORAN (REQ-05 s/d REQ-10) ====================

app.get('/api/rekapitulasi', async (req, res) => {
  try {
    const { start_date, end_date, penjamin } = req.query;
    const db = await getDb();

    let visits = db.kunjungan.map(k => {
      const pasien = db.pasien.find(p => p.id === Number(k.pasien_id)) || {};
      const poli = db.poli.find(pl => pl.id === Number(k.poli_id)) || {};
      const dokter = db.dokter.find(d => d.id === Number(k.dokter_id)) || {};
      const age = getAge(pasien.tanggal_lahir);

      return {
        ...k,
        nama_pasien: pasien.nama || '',
        no_rm: pasien.no_rm || '',
        tanggal_lahir: pasien.tanggal_lahir || '',
        jenis_kelamin: pasien.jenis_kelamin || 'L',
        nama_poli: poli.nama_poli || '',
        nama_dokter: dokter.nama_dokter || '',
        usia: age,
        rentang_usia: getAgeGroup(pasien.tanggal_lahir)
      };
    });

    if (start_date) {
      visits = visits.filter(v => v.tanggal_kunjungan >= start_date);
    }
    if (end_date) {
      visits = visits.filter(v => v.tanggal_kunjungan <= end_date);
    }
    if (penjamin) {
      visits = visits.filter(v => v.penjamin === penjamin);
    }

    // Agregasi Statistik
    const totalKunjungan = visits.length;
    const statusCounts = { Baru: 0, Lama: 0 };
    const penjaminCounts = { Umum: 0, 'BPJS/JKN': 0 };
    const genderCounts = { L: 0, P: 0 };
    const ageGroupCounts = {
      '0–7 hr': 0,
      '8–20 hr': 0,
      '1–11 bln': 0,
      '1–4 th': 0,
      '5–9 th': 0,
      '10–14 th': 0,
      '15–19 th': 0,
      '20–44 th': 0,
      '44–60 th': 0,
      '>60 th': 0
    };
    const poliCounts = {};

    visits.forEach(v => {
      if (v.status_pasien === 'Baru') statusCounts.Baru++;
      else statusCounts.Lama++;

      if (v.penjamin === 'BPJS/JKN') penjaminCounts['BPJS/JKN']++;
      else penjaminCounts.Umum++;

      if (v.jenis_kelamin === 'L') genderCounts.L++;
      else if (v.jenis_kelamin === 'P') genderCounts.P++;

      if (ageGroupCounts[v.rentang_usia] !== undefined) {
        ageGroupCounts[v.rentang_usia]++;
      }

      poliCounts[v.nama_poli] = (poliCounts[v.nama_poli] || 0) + 1;
    });

    res.json({
      success: true,
      summary: {
        totalKunjungan,
        statusCounts,
        penjaminCounts,
        genderCounts,
        ageGroupCounts,
        poliCounts
      },
      detail: visits.sort((a, b) => (a.tanggal_kunjungan < b.tanggal_kunjungan ? -1 : 1))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single Page Application Fallback (Serve index.html for non-API routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

// Start Server conditionally (for local node vs Vercel serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`Server Backend Klinik Utama Jati Asih Medika berjalan di port ${PORT}`);
    await initMysql();
  });
}

export default app;
