import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel / Serverless, project files are read-only (/var/task). Write to /tmp/ instead.
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION;
const seedDbPath = path.resolve(__dirname, '../klinik_db.json');
const writableDbPath = isServerless ? path.join(os.tmpdir(), 'klinik_db.json') : seedDbPath;

// In-memory fallback database for active session
let inMemoryDb = null;

// Initial seed data
const initialData = {
  pasien: [],
  poli: [
    { id: 1, nama_poli: 'Rehabilitasi Medik' },
    { id: 2, nama_poli: 'Spesialis Anak' },
    { id: 3, nama_poli: 'Spesialis Syaraf' },
    { id: 4, nama_poli: 'Dokter Umum' },
    { id: 5, nama_poli: 'Dokter Gigi Umum' },
    { id: 6, nama_poli: 'Dokter Gigi Spesialis Kesehatan Gigi Anak' }
  ],
  dokter: [
    { id: 1, nama_dokter: 'dr. Fatchur Rochman, Sp.KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
    { id: 2, nama_dokter: 'dr. Subagyo, Sp. KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
    { id: 3, nama_dokter: 'dr. Bayu Santoso, Sp.KFR (K)', spesialisasi: 'Rehabilitasi Medik', poli_id: 1 },
    { id: 4, nama_dokter: 'dr. Ratna Hadju, Sp.A', spesialisasi: 'Spesialis Anak', poli_id: 2 },
    { id: 5, nama_dokter: 'dr. Ariesia Dewi C, Sp.N', spesialisasi: 'Spesialis Syaraf', poli_id: 3 },
    { id: 6, nama_dokter: 'dr. Siti Sundari Manoppo', spesialisasi: 'Dokter Umum', poli_id: 4 },
    { id: 7, nama_dokter: 'dr. Jessica Amelinda Mintarjo', spesialisasi: 'Dokter Umum', poli_id: 4 },
    { id: 8, nama_dokter: 'drg. Nurus Saadah', spesialisasi: 'Dokter Gigi Umum', poli_id: 5 },
    { id: 9, nama_dokter: 'drg. Brian Maulani, Sp. KGA', spesialisasi: 'Dokter Gigi Spesialis Kesehatan Gigi Anak', poli_id: 6 }
  ],
  kunjungan: []
};

export async function readDb() {
  if (globalThis.__KLINIK_DB_STORE__) {
    return globalThis.__KLINIK_DB_STORE__;
  }
  if (inMemoryDb) {
    return inMemoryDb;
  }

  // 1. Try reading from writableDbPath (/tmp/klinik_db.json on Vercel)
  try {
    const data = await fs.readFile(writableDbPath, 'utf8');
    inMemoryDb = JSON.parse(data);
    globalThis.__KLINIK_DB_STORE__ = inMemoryDb;
    return inMemoryDb;
  } catch (err) {
    // If not found in /tmp, try seedDbPath
  }

  // 2. Try reading from seedDbPath (project root klinik_db.json)
  try {
    const data = await fs.readFile(seedDbPath, 'utf8');
    inMemoryDb = JSON.parse(data);
    globalThis.__KLINIK_DB_STORE__ = inMemoryDb;
    return inMemoryDb;
  } catch (err) {
    // Fallback to embedded initialData
    inMemoryDb = JSON.parse(JSON.stringify(initialData));
    globalThis.__KLINIK_DB_STORE__ = inMemoryDb;
    return inMemoryDb;
  }
}

export async function writeDb(data) {
  inMemoryDb = data;
  globalThis.__KLINIK_DB_STORE__ = data;

  try {
    await fs.writeFile(writableDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // If write to file system fails on serverless, inMemoryDb still persists during lambda lifecycle
    console.warn('Warning: Could not write to disk, using in-memory store:', err.message);
  }
}

