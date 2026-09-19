import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper percent string
const getPercent = (count, total) => {
  if (!total) return '0%';
  return `${((count / total) * 100).toFixed(1)}%`;
};

// Export to Excel (.xlsx) - Executive Dashboard Style
export const exportToExcel = (data = [], summary = {}, filterInfo = {}) => {
  try {
    const wb = XLSX.utils.book_new();
    const total = summary.totalKunjungan || 0;

    // ==================== SHEET 1: DASHBOARD REKAPITULASI ====================
    const dashboardRows = [
      ['========================================================================================================='],
      ['                         DASHBOARD EXECUTIVE REKAPITULASI KUNJUNGAN PASIEN'],
      ['                                   KLINIK UTAMA JATI ASIH MEDIKA'],
      ['========================================================================================================='],
      [],
      ['📋 INFORMASI LAPORAN', '', '', '', '📊 METRIK UTAMA KUNJUNGAN'],
      ['Periode Laporan', ':', filterInfo.periode || 'Semua Periode', '', 'Total Kunjungan Pasien', summary.totalKunjungan || 0, '100%'],
      ['Filter Penjamin', ':', filterInfo.penjamin || 'Semua Penjamin', '', 'Pasien Baru', summary.statusCounts?.Baru || 0, getPercent(summary.statusCounts?.Baru || 0, total)],
      ['Tanggal Cetak', ':', new Date().toLocaleDateString('id-ID'), '', 'Pasien Lama', summary.statusCounts?.Lama || 0, getPercent(summary.statusCounts?.Lama || 0, total)],
      [],
      ['---------------------------------------------------------------------------------------------------------'],
      [],
      ['💳 REKAPITULASI PENJAMIN', '', '', '', '👶 REKAPITULASI KELOMPOK USIA'],
      ['Kategori Penjamin', 'Jumlah Pasien', 'Persentase', '', 'Rentang Usia Klinik', 'Jumlah Pasien', 'Persentase'],
      ['Penjamin BPJS / JKN', summary.penjaminCounts?.['BPJS/JKN'] || 0, getPercent(summary.penjaminCounts?.['BPJS/JKN'] || 0, total), '', '0 – 7 Hari', summary.ageGroupCounts?.['0–7 hr'] || 0, getPercent(summary.ageGroupCounts?.['0–7 hr'] || 0, total)],
      ['Penjamin Umum', summary.penjaminCounts?.Umum || 0, getPercent(summary.penjaminCounts?.Umum || 0, total), '', '8 – 20 Hari', summary.ageGroupCounts?.['8–20 hr'] || 0, getPercent(summary.ageGroupCounts?.['8–20 hr'] || 0, total)],
      ['', '', '', '', '1 – 11 Bulan', summary.ageGroupCounts?.['1–11 bln'] || 0, getPercent(summary.ageGroupCounts?.['1–11 bln'] || 0, total)],
      ['👥 DEMOGRAFI JENIS KELAMIN', '', '', '', '1 – 4 Tahun', summary.ageGroupCounts?.['1–4 th'] || 0, getPercent(summary.ageGroupCounts?.['1–4 th'] || 0, total)],
      ['Jenis Kelamin', 'Jumlah Pasien', 'Persentase', '', '5 – 9 Tahun', summary.ageGroupCounts?.['5–9 th'] || 0, getPercent(summary.ageGroupCounts?.['5–9 th'] || 0, total)],
      ['Laki-Laki (L)', summary.genderCounts?.L || 0, getPercent(summary.genderCounts?.L || 0, total), '', '10 – 14 Tahun', summary.ageGroupCounts?.['10–14 th'] || 0, getPercent(summary.ageGroupCounts?.['10–14 th'] || 0, total)],
      ['Perempuan (P)', summary.genderCounts?.P || 0, getPercent(summary.genderCounts?.P || 0, total), '', '15 – 19 Tahun', summary.ageGroupCounts?.['15–19 th'] || 0, getPercent(summary.ageGroupCounts?.['15–19 th'] || 0, total)],
      ['', '', '', '', '20 – 44 Tahun', summary.ageGroupCounts?.['20–44 th'] || 0, getPercent(summary.ageGroupCounts?.['20–44 th'] || 0, total)],
      ['', '', '', '', '44 – 60 Tahun', summary.ageGroupCounts?.['44–60 th'] || 0, getPercent(summary.ageGroupCounts?.['44–60 th'] || 0, total)],
      ['', '', '', '', '> 60 Tahun', summary.ageGroupCounts?.['>60 th'] || 0, getPercent(summary.ageGroupCounts?.['>60 th'] || 0, total)],
      [],
      ['---------------------------------------------------------------------------------------------------------'],
      [],
      ['🏥 REKAPITULASI PER POLI / PELAYANAN MEDIS'],
      ['Nama Poli / Pelayanan', 'Jumlah Kunjungan', 'Persentase Kunjungan'],
      ...Object.entries(summary.poliCounts || {}).map(([poli, count]) => [
        poli,
        count,
        getPercent(count, total)
      ]),
      [],
      ['========================================================================================================='],
      ['  Klinik Utama Jati Asih Medika - Document Generated Automatically']
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(dashboardRows);

    wsSummary['!cols'] = [
      { wch: 32 },
      { wch: 18 },
      { wch: 16 },
      { wch: 5 },
      { wch: 32 },
      { wch: 18 },
      { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Dashboard Rekapitulasi');

    // ==================== SHEET 2: DETAIL DATA KUNJUNGAN ====================
    const detailRows = data.map((item, idx) => ({
      'No': idx + 1,
      'No. Registrasi': item.no_registrasi || '-',
      'Tanggal Kunjungan': item.tanggal_kunjungan || '-',
      'Waktu': item.waktu_kunjungan || '-',
      'No. RM': item.no_rm || '-',
      'Nama Pasien': item.nama_pasien || '-',
      'Status Pasien': `Pasien ${item.status_pasien || 'Baru'}`,
      'Jenis Kelamin': item.jenis_kelamin === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)',
      'Usia': `${item.usia || 0} th`,
      'Rentang Usia': item.rentang_usia || '-',
      'Pelayanan / Poli': item.nama_poli || '-',
      'Dokter Pemeriksa': item.nama_dokter || '-',
      'Jenis Penjamin': item.penjamin || '-',
      'No. Kartu BPJS / Pembayaran': item.no_kartu_penjamin || '-',
      'Tindakan Medis': item.tindakan || '-',
      'Catatan Pasien': item.catatan || '-'
    }));

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);

    wsDetail['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 26 },
      { wch: 15 },
      { wch: 18 },
      { wch: 10 },
      { wch: 22 },
      { wch: 26 },
      { wch: 28 },
      { wch: 16 },
      { wch: 26 },
      { wch: 32 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Data Kunjungan');

    const filename = `Dashboard_Rekapitulasi_JatiAsihMedika_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Error generating Excel:', err);
    alert('Gagal mengekspor Excel: ' + err.message);
  }
};

// Load Logo image as HTMLImageElement
const loadLogoImage = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = '/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

// Export to PDF (.pdf) - Executive Dashboard PDF Layout
export const exportToPDF = async (data = [], summary = {}, filterInfo = {}) => {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const total = summary.totalKunjungan || 0;
    const logoImg = await loadLogoImage();

    const runAutoTable = (config) => {
      if (typeof autoTable === 'function') {
        autoTable(doc, config);
      } else if (typeof doc.autoTable === 'function') {
        doc.autoTable(config);
      }
    };

    // Center point for A4 Landscape (width 297mm)
    const centerX = 148.5;

    // ==================== PAGE 1: EXECUTIVE DASHBOARD ====================

    // Centered Header Block (Logo on the left of Title Text)
    const titleText = 'KLINIK UTAMA JATI ASIH MEDIKA';
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    const titleWidth = doc.getTextWidth(titleText);
    const logoWidth = 12;
    const logoHeight = 12;
    const logoGap = 3.5;

    let textY = 17;
    if (logoImg) {
      const totalHeaderWidth = logoWidth + logoGap + titleWidth;
      const startX = centerX - (totalHeaderWidth / 2);
      
      // Render Logo on the left of title
      doc.addImage(logoImg, 'PNG', startX, 9.5, logoWidth, logoHeight);

      // Render Title text next to logo
      doc.setTextColor(2, 132, 199); // Clinic primary blue
      doc.text(titleText, startX + logoWidth + logoGap, 18.5);
    } else {
      doc.setTextColor(2, 132, 199);
      doc.text(titleText, centerX, textY, { align: 'center' });
    }

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Jl. Semolowaru Utara V No.2A, Semolowaru, Kec. Sukolilo, Surabaya, Jawa Timur 60119 | Telp: 0812-3235-6932 | Email: info@jatiasihmedika.com', centerX, 25, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.setDrawColor(2, 132, 199);
    doc.line(14, 28, 283, 28);

    // Judul & Subtitle
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('DASHBOARD EXECUTIVE REKAPITULASI KUNJUNGAN PASIEN', centerX, 34, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${filterInfo.periode || 'Semua Periode'}  |  Penjamin: ${filterInfo.penjamin || 'Semua Penjamin'}  |  Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, centerX, 39, { align: 'center' });

    // KPI Summary Cards (4 Cards across top)
    const cardY = 44;
    const cardHeight = 20;
    const cardWidth = 63;
    const gap = 5.5;

    // Card 1: Total Kunjungan
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(3, 105, 161);
    doc.text('TOTAL KUNJUNGAN PASIEN', 18, cardY + 5);
    doc.setFontSize(13);
    doc.text(`${total}`, 18, cardY + 12);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text('Keseluruhan Pasien Terdaftar', 18, cardY + 17);

    // Card 2: Status Pasien (REQ-03)
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(14 + cardWidth + gap, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202);
    doc.text('STATUS PASIEN', 18 + cardWidth + gap, cardY + 5);
    doc.setFontSize(10);
    doc.text(`Baru: ${summary.statusCounts?.Baru || 0}   |   Lama: ${summary.statusCounts?.Lama || 0}`, 18 + cardWidth + gap, cardY + 12);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Proporsi: ${getPercent(summary.statusCounts?.Baru || 0, total)} Baru`, 18 + cardWidth + gap, cardY + 17);

    // Card 3: Penjamin (REQ-06)
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14 + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text('PENJAMIN PASIEN', 18 + (cardWidth + gap) * 2, cardY + 5);
    doc.setFontSize(10);
    doc.text(`BPJS: ${summary.penjaminCounts?.['BPJS/JKN'] || 0}   |   Umum: ${summary.penjaminCounts?.Umum || 0}`, 18 + (cardWidth + gap) * 2, cardY + 12);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text(`BPJS / JKN: ${getPercent(summary.penjaminCounts?.['BPJS/JKN'] || 0, total)}`, 18 + (cardWidth + gap) * 2, cardY + 17);

    // Card 4: Demografi Gender
    doc.setFillColor(253, 242, 248);
    doc.setDrawColor(251, 207, 232);
    doc.roundedRect(14 + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(190, 24, 93);
    doc.text('DEMOGRAFI GENDER', 18 + (cardWidth + gap) * 3, cardY + 5);
    doc.setFontSize(10);
    doc.text(`Laki: ${summary.genderCounts?.L || 0}   |   Perempuan: ${summary.genderCounts?.P || 0}`, 18 + (cardWidth + gap) * 3, cardY + 12);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text(`L: ${getPercent(summary.genderCounts?.L || 0, total)}  |  P: ${getPercent(summary.genderCounts?.P || 0, total)}`, 18 + (cardWidth + gap) * 3, cardY + 17);

    // TABLE 1: REKAPITULASI PENJAMIN & DEMOGRAFI GENDER (Left Side Page 1)
    const tableStartY = cardY + 24;
    const penjaminGenderData = [
      ['Pasien Baru', summary.statusCounts?.Baru || 0, getPercent(summary.statusCounts?.Baru || 0, total)],
      ['Pasien Lama', summary.statusCounts?.Lama || 0, getPercent(summary.statusCounts?.Lama || 0, total)],
      ['Penjamin BPJS / JKN', summary.penjaminCounts?.['BPJS/JKN'] || 0, getPercent(summary.penjaminCounts?.['BPJS/JKN'] || 0, total)],
      ['Penjamin Umum', summary.penjaminCounts?.Umum || 0, getPercent(summary.penjaminCounts?.Umum || 0, total)],
      ['Gender Laki-Laki (L)', summary.genderCounts?.L || 0, getPercent(summary.genderCounts?.L || 0, total)],
      ['Gender Perempuan (P)', summary.genderCounts?.P || 0, getPercent(summary.genderCounts?.P || 0, total)]
    ];

    runAutoTable({
      startY: tableStartY,
      margin: { left: 14, right: 153 },
      head: [['Kategori Penjamin & Demografi', 'Jumlah', '% Persentase']],
      body: penjaminGenderData,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // TABLE 2: REKAPITULASI KELOMPOK USIA (REQ-08) (Right Side Page 1)
    const ageGroupData = [
      ['0 – 7 Hari', summary.ageGroupCounts?.['0–7 hr'] || 0, getPercent(summary.ageGroupCounts?.['0–7 hr'] || 0, total)],
      ['8 – 20 Hari', summary.ageGroupCounts?.['8–20 hr'] || 0, getPercent(summary.ageGroupCounts?.['8–20 hr'] || 0, total)],
      ['1 – 11 Bulan', summary.ageGroupCounts?.['1–11 bln'] || 0, getPercent(summary.ageGroupCounts?.['1–11 bln'] || 0, total)],
      ['1 – 4 Tahun', summary.ageGroupCounts?.['1–4 th'] || 0, getPercent(summary.ageGroupCounts?.['1–4 th'] || 0, total)],
      ['5 – 9 Tahun', summary.ageGroupCounts?.['5–9 th'] || 0, getPercent(summary.ageGroupCounts?.['5–9 th'] || 0, total)],
      ['10 – 14 Tahun', summary.ageGroupCounts?.['10–14 th'] || 0, getPercent(summary.ageGroupCounts?.['10–14 th'] || 0, total)],
      ['15 – 19 Tahun', summary.ageGroupCounts?.['15–19 th'] || 0, getPercent(summary.ageGroupCounts?.['15–19 th'] || 0, total)],
      ['20 – 44 Tahun', summary.ageGroupCounts?.['20–44 th'] || 0, getPercent(summary.ageGroupCounts?.['20–44 th'] || 0, total)],
      ['44 – 60 Tahun', summary.ageGroupCounts?.['44–60 th'] || 0, getPercent(summary.ageGroupCounts?.['44–60 th'] || 0, total)],
      ['> 60 Tahun', summary.ageGroupCounts?.['>60 th'] || 0, getPercent(summary.ageGroupCounts?.['>60 th'] || 0, total)]
    ];

    runAutoTable({
      startY: tableStartY,
      margin: { left: 153, right: 14 },
      head: [['Kelompok Rentang Usia', 'Jumlah', '% Persentase']],
      body: ageGroupData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // TABLE 3: REKAPITULASI PER POLI / PELAYANAN MEDIS (Full Width Bottom Page 1)
    const poliData = Object.entries(summary.poliCounts || {}).map(([poli, count]) => [
      poli,
      count,
      getPercent(count, total)
    ]);

    runAutoTable({
      startY: tableStartY + 56,
      margin: { left: 14, right: 14 },
      head: [['Poli / Pelayanan Medis', 'Jumlah Kunjungan Pasien', 'Persentase Kunjungan']],
      body: poliData.length > 0 ? poliData : [['Tidak ada data poli', 0, '0%']],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Footer Page 1
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Klinik Utama Jati Asih Medika - Halaman 1 dari 2 (Dashboard Rekapitulasi)', centerX, 202, { align: 'center' });

    // ==================== PAGE 2: TABEL DETAIL KUNJUNGAN PASIEN ====================
    doc.addPage('a4', 'landscape');

    // Header Page 2 (Logo on the left of title)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    const p2TitleText = 'KLINIK UTAMA JATI ASIH MEDIKA';
    const p2TitleWidth = doc.getTextWidth(p2TitleText);
    const p2LogoWidth = 10;
    const p2LogoHeight = 10;
    const p2LogoGap = 3;

    if (logoImg) {
      const p2TotalHeaderWidth = p2LogoWidth + p2LogoGap + p2TitleWidth;
      const p2StartX = centerX - (p2TotalHeaderWidth / 2);

      doc.addImage(logoImg, 'PNG', p2StartX, 9, p2LogoWidth, p2LogoHeight);
      doc.setTextColor(2, 132, 199);
      doc.text(p2TitleText, p2StartX + p2LogoWidth + p2LogoGap, 16.5);
    } else {
      doc.setTextColor(2, 132, 199);
      doc.text(p2TitleText, centerX, 15, { align: 'center' });
    }

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('RINCIAN TRANSAKSI KUNJUNGAN PASIEN', centerX, 23, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${filterInfo.periode || 'Semua Periode'}  |  Total: ${data.length} Kunjungan Pasien`, centerX, 28, { align: 'center' });
    doc.line(14, 31, 283, 31);

    // Tabel Detail Kunjungan
    const tableDetailData = data.map((item, idx) => [
      idx + 1,
      item.no_registrasi || '-',
      item.tanggal_kunjungan || '-',
      item.no_rm || '-',
      item.nama_pasien || '-',
      item.status_pasien || '-',
      item.jenis_kelamin === 'L' ? 'L' : 'P',
      `${item.usia || 0} th`,
      item.rentang_usia || '-',
      item.nama_poli || '-',
      item.nama_dokter || '-',
      item.penjamin || '-',
      item.tindakan || '-'
    ]);

    runAutoTable({
      startY: 34,
      margin: { left: 14, right: 14 },
      head: [['No', 'No Reg', 'Tanggal', 'No. RM', 'Nama Pasien', 'Status', 'JK', 'Usia', 'Kategori Usia', 'Poli', 'Dokter', 'Penjamin', 'Tindakan']],
      body: tableDetailData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 26 },
        2: { cellWidth: 20 },
        3: { cellWidth: 24 },
        4: { cellWidth: 32 },
        5: { cellWidth: 16 },
        6: { cellWidth: 10 },
        7: { cellWidth: 14 },
        8: { cellWidth: 26 },
        9: { cellWidth: 26 },
        10: { cellWidth: 30 },
        11: { cellWidth: 18 },
        12: { cellWidth: 'auto' }
      }
    });

    // Footer Page 2
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Klinik Utama Jati Asih Medika - Halaman 2 dari 2 (Detail Kunjungan)', centerX, 202, { align: 'center' });

    const filename = `Dashboard_Rekapitulasi_JatiAsihMedika_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Gagal membuat PDF: ' + err.message);
  }
};
