-- ============================================================
-- SQL SPECIFIC UNTUK INFINITYFREE / PHPMYADMIN HOSTING
-- (Tanpa query CREATE DATABASE karena DB dibuat via Control Panel)
-- ============================================================

-- 1. TABEL POLI
CREATE TABLE IF NOT EXISTS `poli` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_poli` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL DOKTER
CREATE TABLE IF NOT EXISTS `dokter` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_dokter` VARCHAR(100) NOT NULL,
  `spesialisasi` VARCHAR(100) DEFAULT '',
  `poli_id` INT,
  FOREIGN KEY (`poli_id`) REFERENCES `poli`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL PASIEN
CREATE TABLE IF NOT EXISTS `pasien` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no_rm` VARCHAR(50) NOT NULL UNIQUE,
  `nama` VARCHAR(100) NOT NULL,
  `nik` VARCHAR(50) DEFAULT '',
  `no_bpjs` VARCHAR(50) DEFAULT '',
  `tanggal_lahir` DATE NOT NULL,
  `jenis_kelamin` ENUM('L', 'P') NOT NULL,
  `alamat` TEXT,
  `no_hp` VARCHAR(30) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL KUNJUNGAN
CREATE TABLE IF NOT EXISTS `kunjungan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `no_registrasi` VARCHAR(50) NOT NULL UNIQUE,
  `tanggal_kunjungan` DATE NOT NULL,
  `waktu_kunjungan` VARCHAR(10) NOT NULL,
  `pasien_id` INT NOT NULL,
  `status_pasien` ENUM('Baru', 'Lama') NOT NULL,
  `poli_id` INT NOT NULL,
  `dokter_id` INT NOT NULL,
  `penjamin` ENUM('Umum', 'BPJS/JKN') NOT NULL,
  `no_kartu_penjamin` VARCHAR(50) DEFAULT '',
  `tindakan` TEXT,
  `catatan` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`poli_id`) REFERENCES `poli`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dokter_id`) REFERENCES `dokter`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED DATA AWAL
-- ============================================================

INSERT IGNORE INTO `poli` (`id`, `nama_poli`) VALUES
(1, 'Rehabilitasi Medik'),
(2, 'Spesialis Anak'),
(3, 'Spesialis Syaraf'),
(4, 'Dokter Umum'),
(5, 'Dokter Gigi Umum'),
(6, 'Dokter Gigi Spesialis Kesehatan Gigi Anak');

INSERT IGNORE INTO `dokter` (`id`, `nama_dokter`, `spesialisasi`, `poli_id`) VALUES
(1, 'dr. Fatchur Rochman, Sp.KFR (K)', 'Rehabilitasi Medik', 1),
(2, 'dr. Subagyo, Sp. KFR (K)', 'Rehabilitasi Medik', 1),
(3, 'dr. Bayu Santoso, Sp.KFR (K)', 'Rehabilitasi Medik', 1),
(4, 'dr. Ratna Hadju, Sp.A', 'Spesialis Anak', 2),
(5, 'dr. Ariesia Dewi C, Sp.N', 'Spesialis Syaraf', 3),
(6, 'dr. Siti Sundari Manoppo', 'Dokter Umum', 4),
(7, 'dr. Jessica Amelinda Mintarjo', 'Dokter Umum', 4),
(8, 'drg. Nurus Saadah', 'Dokter Gigi Umum', 5),
(9, 'drg. Brian Maulani, Sp. KGA', 'Dokter Gigi Spesialis Kesehatan Gigi Anak', 6);

INSERT IGNORE INTO `pasien` (`id`, `no_rm`, `nama`, `nik`, `no_bpjs`, `tanggal_lahir`, `jenis_kelamin`, `alamat`, `no_hp`) VALUES
(1, 'RM-2026-0001', 'Andi Pratama', '3275011205900001', '0001234567891', '1990-05-12', 'L', 'Jl. Jati Asih No. 12, Bekasi', '081234567890'),
(2, 'RM-2026-0002', 'Siti Nurhaliza', '3275015508850002', '', '1985-08-15', 'P', 'Jl. Kp. Sawah No. 45, Bekasi', '081987654321'),
(3, 'RM-2026-0003', 'Muhammad Rizky', '3275012010210003', '0009876543210', '2021-10-20', 'L', 'Jl. Ratna No. 8, Jati Asih', '085711223344'),
(4, 'RM-2026-0004', 'Eka Suryani', '3275014304600004', '', '1960-04-03', 'P', 'Jl. Wibawa Mukti II No. 19, Bekasi', '081399887766');

INSERT IGNORE INTO `kunjungan` (`id`, `no_registrasi`, `tanggal_kunjungan`, `waktu_kunjungan`, `pasien_id`, `status_pasien`, `poli_id`, `dokter_id`, `penjamin`, `no_kartu_penjamin`, `tindakan`, `catatan`) VALUES
(1, 'REG-20260910-001', '2026-09-10', '08:30', 1, 'Baru', 1, 1, 'BPJS/JKN', '0001234567891', 'Pemeriksaan Rutin & Resep Obat', 'Pasien mengeluh demam'),
(2, 'REG-20260911-001', '2026-09-11', '09:15', 2, 'Baru', 2, 2, 'Umum', '', 'Penambalan Gigi berlubang', 'Gigi geraham kanan'),
(3, 'REG-20260911-002', '2026-09-11', '10:00', 3, 'Baru', 3, 3, 'BPJS/JKN', '0009876543210', 'Imunisasi Balita', 'Batuk ringan'),
(4, 'REG-20260912-001', '2026-09-12', '08:00', 4, 'Baru', 4, 4, 'Umum', '', 'Pemeriksaan Hipertensi & EKG', 'Kontrol rutin Lansia'),
(5, 'REG-20260912-002', '2026-09-12', '10:30', 1, 'Lama', 1, 1, 'BPJS/JKN', '0001234567891', 'Kontrol Ulang Pasca Demam', 'Kondisi membaik');
