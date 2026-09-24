import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic MySQL Configuration
let MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || process.env.MYSQL__HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || process.env.MYSQL__PORT) || 3306,
  user: process.env.MYSQL_USER || process.env.MYSQL__USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.MYSQL__PASSWORD || '',
};

let DB_NAME = process.env.MYSQL_DB || process.env.MYSQL__DB || 'klinik_jati_asih_medika';

// Support DATABASE_URL / MYSQL_URL if provided
const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL;
if (connectionString) {
  try {
    const parsed = new URL(connectionString);
    MYSQL_CONFIG = {
      host: parsed.hostname,
      port: Number(parsed.port) || 3306,
      user: parsed.username,
      password: decodeURIComponent(parsed.password)
    };
    if (parsed.pathname && parsed.pathname.length > 1) {
      DB_NAME = parsed.pathname.substring(1);
    }
  } catch (e) {
    console.warn('Failed parsing connection URL:', e.message);
  }
}

let pool = null;
let isMysqlActive = false;

// Initial Seed Data (Fallback & MySQL Initial Seeding)
const initialSeed = {
  pasien: [],
  poli: [
    { nama_poli: 'Rehabilitasi Medik' },
    { nama_poli: 'Spesialis Anak' },
    { nama_poli: 'Spesialis Syaraf' },
    { nama_poli: 'Dokter Umum' },
    { nama_poli: 'Dokter Gigi Umum' },
    { nama_poli: 'Dokter Gigi Spesialis Kesehatan Gigi Anak' }
  ],
  dokter: [
    { nama_dokter: 'dr. Fatchur Rochman, Sp.KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
    { nama_dokter: 'dr. Subagyo, Sp. KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
    { nama_dokter: 'dr. Bayu Santoso, Sp.KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
    { nama_dokter: 'dr. Ratna Hadju, Sp.A', spesialisasi: 'Spesialis Anak', poli_id: 2 },
    { nama_dokter: 'dr. Ariesia Dewi C, Sp.N', spesialisasi: 'Spesialis Syaraf', poli_id: 3 },
    { nama_dokter: 'dr. Siti Sundari Manoppo', spesialisasi: 'Dokter Umum', poli_id: 4 },
    { nama_dokter: 'dr. Jessica Amelinda Mintarjo', spesialisasi: 'Dokter Umum', poli_id: 4 },
    { nama_dokter: 'drg. Nurus Saadah', spesialisasi: 'Dokter Gigi Umum', poli_id: 5 },
    { nama_dokter: 'drg. Brian Maulani, Sp. KGA', spesialisasi: 'Dokter Gigi Spesialis Kesehatan Gigi Anak', poli_id: 6 }
  ],
  kunjungan: []
};

// Inisialisasi Koneksi & Skema MySQL
export async function initMysql() {
  if (isMysqlActive && pool) return true;

  try {
    // Attempt 1: Direct pool connection with target database
    pool = mysql.createPool({
      ...MYSQL_CONFIG,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000
    });

    try {
      await pool.query('SELECT 1');
      isMysqlActive = true;
    } catch (directErr) {
      // If target database doesn't exist yet on localhost, try creating it
      try {
        const conn = await mysql.createConnection(MYSQL_CONFIG);
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await conn.end();

        await pool.query('SELECT 1');
        isMysqlActive = true;
      } catch (createErr) {
        isMysqlActive = false;
        console.warn(`⚠️ MySQL Connection Warning: ${createErr.message}`);
        return false;
      }
    }

    if (!isMysqlActive) return false;

    console.log(`✅ Sukses terhubung ke Database MySQL: ${DB_NAME} (Host: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port})`);

    // Step 3: Auto Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pasien (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_rm VARCHAR(50) UNIQUE NOT NULL,
        nama VARCHAR(100) NOT NULL,
        nik VARCHAR(50),
        no_bpjs VARCHAR(50),
        tanggal_lahir DATE NOT NULL,
        jenis_kelamin ENUM('L', 'P') NOT NULL,
        alamat TEXT,
        no_hp VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS poli (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_poli VARCHAR(100) UNIQUE NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dokter (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_dokter VARCHAR(100) NOT NULL,
        spesialisasi VARCHAR(100),
        poli_id INT,
        FOREIGN KEY (poli_id) REFERENCES poli(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kunjungan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_registrasi VARCHAR(50) UNIQUE NOT NULL,
        tanggal_kunjungan DATE NOT NULL,
        waktu_kunjungan VARCHAR(10) NOT NULL,
        pasien_id INT NOT NULL,
        status_pasien ENUM('Baru', 'Lama') NOT NULL,
        poli_id INT NOT NULL,
        dokter_id INT NOT NULL,
        penjamin ENUM('Umum', 'BPJS/JKN') NOT NULL,
        no_kartu_penjamin VARCHAR(50),
        tindakan TEXT,
        catatan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pasien_id) REFERENCES pasien(id) ON DELETE CASCADE,
        FOREIGN KEY (poli_id) REFERENCES poli(id) ON DELETE CASCADE,
        FOREIGN KEY (dokter_id) REFERENCES dokter(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Step 4: Seed jika tabel kosong (dengan pencegahan Foreign Key Mismatch)
    try {
      const [rowsPoli] = await pool.query('SELECT COUNT(*) as count FROM poli');
      if (rowsPoli[0].count === 0) {
        for (const p of initialSeed.poli) {
          await pool.query('INSERT IGNORE INTO poli (nama_poli) VALUES (?)', [p.nama_poli]);
        }
      }

      const [poliRows] = await pool.query('SELECT id, nama_poli FROM poli ORDER BY id');
      const legacyPoliNames = new Set(['Poli Umum', 'Poli Gigi', 'Poli KIA & Anak', 'Poli Penyakit Dalam', 'Poli Kebidanan & Kandungan']);
      const targetPoli = [
        { id: 1, nama_poli: 'Rehabilitasi Medik' },
        { id: 2, nama_poli: 'Spesialis Anak' },
        { id: 3, nama_poli: 'Spesialis Syaraf' },
        { id: 4, nama_poli: 'Dokter Umum' },
        { id: 5, nama_poli: 'Dokter Gigi Umum' },
        { id: 6, nama_poli: 'Dokter Gigi Spesialis Kesehatan Gigi Anak' }
      ];

      const hasLegacyPoli = poliRows.some(p => legacyPoliNames.has(p.nama_poli));
      if (hasLegacyPoli) {
        for (const p of targetPoli) {
          const existing = poliRows.find(item => item.id === p.id);
          if (existing) {
            await pool.query('UPDATE poli SET nama_poli = ? WHERE id = ?', [p.nama_poli, p.id]);
          } else {
            await pool.query('INSERT INTO poli (id, nama_poli) VALUES (?, ?)', [p.id, p.nama_poli]);
          }
        }
      }

      const [rowsDokter] = await pool.query('SELECT COUNT(*) as count FROM dokter');
      if (rowsDokter[0].count === 0) {
        for (const d of initialSeed.dokter) {
          await pool.query('INSERT IGNORE INTO dokter (nama_dokter, spesialisasi, poli_id) VALUES (?, ?, ?)', [d.nama_dokter, d.spesialisasi, d.poli_id]);
        }
      }

      const [dokterRows] = await pool.query('SELECT id, nama_dokter, spesialisasi, poli_id FROM dokter ORDER BY id');
      const legacyDokterNames = new Set(['dr. Ahmad Hidayat', 'dr. Siti Rahmawati', 'dr. Budi Santoso, Sp.A', 'dr. Hendra Wijaya, Sp.PD', 'dr. Dewi Lestari, Sp.OG']);
      const targetDokter = [
        { id: 1, nama_dokter: 'dr. Fatchur Rochman, Sp.KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
        { id: 2, nama_dokter: 'dr. Subagyo, Sp. KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
        { id: 3, nama_dokter: 'dr. Bayu Santoso, Sp.KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
        { id: 4, nama_dokter: 'dr. Ratna Hadju, Sp.A', spesialisasi: 'Spesialis Anak', poli_id: 2 },
        { id: 5, nama_dokter: 'dr. Ariesia Dewi C, Sp.N', spesialisasi: 'Spesialis Syaraf', poli_id: 3 },
        { id: 6, nama_dokter: 'dr. Siti Sundari Manoppo', spesialisasi: 'Dokter Umum', poli_id: 4 },
        { id: 7, nama_dokter: 'dr. Jessica Amelinda Mintarjo', spesialisasi: 'Dokter Umum', poli_id: 4 },
        { id: 8, nama_dokter: 'drg. Nurus Saadah', spesialisasi: 'Dokter Gigi Umum', poli_id: 5 },
        { id: 9, nama_dokter: 'drg. Brian Maulani, Sp. KGA', spesialisasi: 'Dokter Gigi Spesialis Kesehatan Gigi Anak', poli_id: 6 }
      ];

      const hasLegacyDokter = dokterRows.some(d => legacyDokterNames.has(d.nama_dokter));
      if (hasLegacyDokter) {
        for (const d of targetDokter) {
          const existing = dokterRows.find(item => item.id === d.id);
          if (existing) {
            await pool.query('UPDATE dokter SET nama_dokter = ?, spesialisasi = ?, poli_id = ? WHERE id = ?', [d.nama_dokter, d.spesialisasi, d.poli_id, d.id]);
          } else {
            await pool.query('INSERT INTO dokter (id, nama_dokter, spesialisasi, poli_id) VALUES (?, ?, ?, ?)', [d.id, d.nama_dokter, d.spesialisasi, d.poli_id]);
          }
        }
      }

      const [rowsPasien] = await pool.query('SELECT COUNT(*) as count FROM pasien');
      if (rowsPasien[0].count === 0) {
        for (const p of initialSeed.pasien) {
          await pool.query(
            'INSERT IGNORE INTO pasien (no_rm, nama, nik, no_bpjs, tanggal_lahir, jenis_kelamin, alamat, no_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [p.no_rm, p.nama, p.nik, p.no_bpjs, p.tanggal_lahir, p.jenis_kelamin, p.alamat, p.no_hp]
          );
        }
      }

      const [rowsKunjungan] = await pool.query('SELECT COUNT(*) as count FROM kunjungan');
      if (rowsKunjungan[0].count === 0) {
        const [pasiens] = await pool.query('SELECT id FROM pasien');
        const [polis] = await pool.query('SELECT id FROM poli');
        const [dokters] = await pool.query('SELECT id FROM dokter');

        const validPasienIds = new Set(pasiens.map(p => p.id));
        const validPoliIds = new Set(polis.map(p => p.id));
        const validDokterIds = new Set(dokters.map(d => d.id));

        for (const k of initialSeed.kunjungan) {
          if (validPasienIds.has(k.pasien_id) && validPoliIds.has(k.poli_id) && validDokterIds.has(k.dokter_id)) {
            try {
              await pool.query(
                'INSERT IGNORE INTO kunjungan (no_registrasi, tanggal_kunjungan, waktu_kunjungan, pasien_id, status_pasien, poli_id, dokter_id, penjamin, no_kartu_penjamin, tindakan, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [k.no_registrasi, k.tanggal_kunjungan, k.waktu_kunjungan, k.pasien_id, k.status_pasien, k.poli_id, k.dokter_id, k.penjamin, k.no_kartu_penjamin, k.tindakan, k.catatan]
              );
            } catch (kunjunganErr) {
              console.warn('Seed kunjungan warning:', kunjunganErr.message);
            }
          }
        }
      }
    } catch (seedError) {
      console.warn('Notice: Seeding MySQL skip/partial:', seedError.message);
    }

    return true;
  } catch (err) {
    isMysqlActive = false;
    console.warn(`⚠️ MySQL belum aktif atau tidak dapat terhubung: (${err.message}). Menggunakan mode persitensi berkas data.`);
    return false;
  }
}

// Fetch all data from MySQL in same object format as JSON dbStore
export async function readDbFromMysql() {
  if (!isMysqlActive || !pool) return null;
  try {
    const [pasien] = await pool.query('SELECT * FROM pasien ORDER BY id ASC');
    const [poli] = await pool.query('SELECT * FROM poli ORDER BY id ASC');
    const [dokter] = await pool.query('SELECT * FROM dokter ORDER BY id ASC');
    const [kunjungan] = await pool.query('SELECT * FROM kunjungan ORDER BY id ASC');

    // Format tanggal ke YYYY-MM-DD string
    const formattedPasien = pasien.map(p => ({
      ...p,
      tanggal_lahir: p.tanggal_lahir ? new Date(p.tanggal_lahir).toISOString().split('T')[0] : ''
    }));

    const formattedKunjungan = kunjungan.map(k => ({
      ...k,
      tanggal_kunjungan: k.tanggal_kunjungan ? new Date(k.tanggal_kunjungan).toISOString().split('T')[0] : ''
    }));

    return {
      pasien: formattedPasien,
      poli,
      dokter,
      kunjungan: formattedKunjungan
    };
  } catch (err) {
    console.error('Error readDbFromMysql:', err);
    return null;
  }
}

export function isMysqlConnected() {
  return isMysqlActive;
}

export { pool };
