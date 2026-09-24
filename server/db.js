const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../klinik.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Gagal terhubung ke SQLite Database:', err.message);
  } else {
    console.log('Terhubung ke SQLite Database Klinik Utama Jati Asih Medika:', dbPath);
  }
});

// Helper for Promisified Queries
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initial Schema Setup & Seeding
const initDb = async () => {
  try {
    // Tabel Pasien
    await dbRun(`
      CREATE TABLE IF NOT EXISTS pasien (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        no_rm TEXT UNIQUE NOT NULL,
        nama TEXT NOT NULL,
        nik TEXT,
        no_bpjs TEXT,
        tanggal_lahir DATE NOT NULL,
        jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')) NOT NULL,
        alamat TEXT,
        no_hp TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel Poli / Pelayanan
    await dbRun(`
      CREATE TABLE IF NOT EXISTS poli (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_poli TEXT UNIQUE NOT NULL
      )
    `);

    // Tabel Dokter
    await dbRun(`
      CREATE TABLE IF NOT EXISTS dokter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_dokter TEXT NOT NULL,
        spesialisasi TEXT,
        poli_id INTEGER,
        FOREIGN KEY (poli_id) REFERENCES poli(id)
      )
    `);

    // Tabel Kunjungan
    await dbRun(`
      CREATE TABLE IF NOT EXISTS kunjungan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        no_registrasi TEXT UNIQUE NOT NULL,
        tanggal_kunjungan DATE NOT NULL,
        waktu_kunjungan TIME NOT NULL,
        pasien_id INTEGER NOT NULL,
        status_pasien TEXT CHECK(status_pasien IN ('Baru', 'Lama')) NOT NULL,
        poli_id INTEGER NOT NULL,
        dokter_id INTEGER NOT NULL,
        penjamin TEXT CHECK(penjamin IN ('Umum', 'BPJS/JKN')) NOT NULL,
        no_kartu_penjamin TEXT,
        tindakan TEXT,
        catatan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pasien_id) REFERENCES pasien(id),
        FOREIGN KEY (poli_id) REFERENCES poli(id),
        FOREIGN KEY (dokter_id) REFERENCES dokter(id)
      )
    `);

    const realPoli = [
      { id: 1, nama_poli: 'Rehabilitasi Medik' },
      { id: 2, nama_poli: 'Spesialis Anak' },
      { id: 3, nama_poli: 'Spesialis Syaraf' },
      { id: 4, nama_poli: 'Dokter Umum' },
      { id: 5, nama_poli: 'Dokter Gigi Umum' },
      { id: 6, nama_poli: 'Dokter Gigi Spesialis Kesehatan Gigi Anak' }
    ];

    const realDokter = [
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

    // Seed Master Poli jika kosong, atau migrasi data lama ke data klinik aktual
    const countPoli = await dbGet('SELECT COUNT(*) as count FROM poli');
    if (countPoli.count === 0) {
      for (const p of realPoli) {
        await dbRun('INSERT INTO poli (id, nama_poli) VALUES (?, ?)', [p.id, p.nama_poli]);
      }
    } else {
      const existingPoli = await dbAll('SELECT id, nama_poli FROM poli ORDER BY id');
      const hasLegacyPoli = existingPoli.some(p => ['Poli Umum', 'Poli Gigi', 'Poli KIA & Anak', 'Poli Penyakit Dalam', 'Poli Kebidanan & Kandungan'].includes(p.nama_poli));
      if (hasLegacyPoli) {
        for (const p of realPoli) {
          const row = existingPoli.find(item => item.id === p.id) || null;
          if (row) {
            await dbRun('UPDATE poli SET nama_poli = ? WHERE id = ?', [p.nama_poli, p.id]);
          } else {
            await dbRun('INSERT INTO poli (id, nama_poli) VALUES (?, ?)', [p.id, p.nama_poli]);
          }
        }
      }
    }

    // Seed Master Dokter jika kosong, atau migrasi data lama ke data klinik aktual
    const countDokter = await dbGet('SELECT COUNT(*) as count FROM dokter');
    if (countDokter.count === 0) {
      for (const d of realDokter) {
        await dbRun('INSERT INTO dokter (id, nama_dokter, spesialisasi, poli_id) VALUES (?, ?, ?, ?)', [d.id, d.nama_dokter, d.spesialisasi, d.poli_id]);
      }
    } else {
      const existingDokter = await dbAll('SELECT id, nama_dokter, spesialisasi, poli_id FROM dokter ORDER BY id');
      const hasLegacyDokter = existingDokter.some(d => ['dr. Ahmad Hidayat', 'dr. Siti Rahmawati', 'dr. Budi Santoso, Sp.A', 'dr. Hendra Wijaya, Sp.PD', 'dr. Dewi Lestari, Sp.OG'].includes(d.nama_dokter));
      if (hasLegacyDokter) {
        for (const d of realDokter) {
          const row = existingDokter.find(item => item.id === d.id) || null;
          if (row) {
            await dbRun('UPDATE dokter SET nama_dokter = ?, spesialisasi = ?, poli_id = ? WHERE id = ?', [d.nama_dokter, d.spesialisasi, d.poli_id, d.id]);
          } else {
            await dbRun('INSERT INTO dokter (id, nama_dokter, spesialisasi, poli_id) VALUES (?, ?, ?, ?)', [d.id, d.nama_dokter, d.spesialisasi, d.poli_id]);
          }
        }
      }
    }

    // Data pasien & kunjungan awal dibuat kosong agar mengikuti data klinik aktual.
    const countPasien = await dbGet('SELECT COUNT(*) as count FROM pasien');
    if (countPasien.count === 0) {
      // Tidak ada seed pasien/fake kunjungan; user akan mendaftarkan data baru.
    }

    console.log('Database Klinik Utama Jati Asih Medika berhasil diinisialisasi & di-seed.');
  } catch (err) {
    console.error('Error inisialisasi database:', err);
  }
};

initDb();

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet
};
