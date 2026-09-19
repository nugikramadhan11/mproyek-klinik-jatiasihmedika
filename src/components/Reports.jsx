import React, { useState, useEffect } from 'react';
import { FileBarChart, FileSpreadsheet, FileText, Filter, Calendar, Sparkles } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [penjaminFilter, setPenjaminFilter] = useState('');

  const [data, setData] = useState({ summary: {}, detail: [] });
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        penjamin: penjaminFilter
      }).toString();

      const res = await fetch(`/api/rekapitulasi?${query}`);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate, penjaminFilter]);

  // Preset Periode Shortcuts
  const setTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setMonthFilter = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
    setPenjaminFilter('');
  };

  const { summary = {}, detail = [] } = data;

  const filterInfo = {
    periode: startDate && endDate ? `${startDate} s/d ${endDate}` : (startDate ? `Sejak ${startDate}` : 'Semua Periode'),
    penjamin: penjaminFilter || 'Semua Penjamin (Umum & BPJS'
  };

  const handleExportExcel = () => {
    if (!detail || detail.length === 0) {
      alert('Tidak ada data kunjungan untuk periode filter ini.');
      return;
    }
    exportToExcel(detail, summary, filterInfo);
  };

  const handleExportPDF = async () => {
    if (!detail || detail.length === 0) {
      alert('Tidak ada data kunjungan untuk periode filter ini.');
      return;
    }
    await exportToPDF(detail, summary, filterInfo);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <FileBarChart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Rekapitulasi & Laporan Kunjungan
            </h2>
            <p className="text-xs text-sky-600 font-medium mt-0.5">
              Laporan rekapitulasi data berdasarkan periode, penjamin, gender, dan usia.
            </p>
          </div>
        </div>

        {/* Export Buttons (REQ-09) */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all flex items-center space-x-2 shadow-md shadow-emerald-600/15 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-rose-600 text-white font-extrabold rounded-xl text-xs hover:bg-rose-700 active:scale-95 transition-all flex items-center space-x-2 shadow-md shadow-rose-600/15 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar (REQ-05 & REQ-06) */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-sky-100/70 pb-3.5">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <span>Filter Tanggal & Penjamin</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={setTodayFilter}
              className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 hover:bg-sky-100 transition"
            >
              Hari Ini
            </button>
            <button
              onClick={setMonthFilter}
              className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 hover:bg-sky-100 transition"
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Tanggal Awal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Periode Tanggal Awal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Periode Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          {/* Filter Penjamin (REQ-06) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Filter Penjamin</label>
            <select
              value={penjaminFilter}
              onChange={(e) => setPenjaminFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
            >
              <option value="">Semua Penjamin (Umum & BPJS/JKN)</option>
              <option value="BPJS/JKN">BPJS / JKN Saja</option>
              <option value="Umum">Umum Saja</option>
            </select>
          </div>

        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Total Kunjungan */}
        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Kunjungan</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{summary.totalKunjungan || 0}</h3>
          <p className="text-xs text-sky-700 font-semibold mt-1">Pasien Baru: {summary.statusCounts?.Baru || 0} &bull; Lama: {summary.statusCounts?.Lama || 0}</p>
        </div>

        {/* Penjamin Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Penjamin</p>
          <div className="flex justify-between items-baseline mt-1">
            <div>
              <span className="text-2xl font-black text-indigo-600">{summary.penjaminCounts?.['BPJS/JKN'] || 0}</span>
              <span className="text-xs font-bold text-slate-500 block">BPJS / JKN</span>
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-600">{summary.penjaminCounts?.Umum || 0}</span>
              <span className="text-xs font-bold text-slate-500 block">Umum</span>
            </div>
          </div>
        </div>

        {/* Gender Breakdown (REQ-07) */}
        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Gender</p>
          <div className="flex justify-between items-baseline mt-1">
            <div>
              <span className="text-2xl font-black text-sky-600">{summary.genderCounts?.L || 0}</span>
              <span className="text-xs font-bold text-slate-500 block">Laki-Laki (L)</span>
            </div>
            <div>
              <span className="text-2xl font-black text-rose-500">{summary.genderCounts?.P || 0}</span>
              <span className="text-xs font-bold text-slate-500 block">Perempuan (P)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tabel Detail Rekapitulasi */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden space-y-3">
        <div className="p-5 border-b border-sky-100/70 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-sm">Tabel Rincian Rekapitulasi Kunjungan</h3>
          <span className="text-xs text-sky-600 font-medium">Diurutkan berdasar tanggal terbaru</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sky-600 font-semibold animate-pulse">Memuat rekapitulasi...</div>
        ) : detail.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Tidak ada data untuk periode filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/80 border-b border-sky-100 text-sky-900 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4 text-center">No</th>
                  <th className="px-4 py-4 text-center">No. Reg / Tgl</th>
                  <th className="px-4 py-4 text-center">No. RM</th>
                  <th className="px-4 py-4 text-left">Nama Pasien</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Gender</th>
                  <th className="px-4 py-4 text-center">Usia & Kategori</th>
                  <th className="px-4 py-4 text-left">Poli / Dokter</th>
                  <th className="px-4 py-4 text-center">Penjamin</th>
                  <th className="px-4 py-4 text-left">Tindakan Medis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {detail.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-sky-50/60 transition-colors duration-150">
                    <td className="px-4 py-3.5 font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-mono text-center">
                      <span className="font-bold text-slate-800">{item.no_registrasi}</span>
                      <p className="text-slate-400 text-[11px]">{item.tanggal_kunjungan}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-sky-700 text-center">{item.no_rm}</td>
                    <td className="px-4 py-3.5 font-extrabold text-sky-700 text-left whitespace-nowrap">{item.nama_pasien}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap shadow-xs ${
                        item.status_pasien === 'Baru' ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        Pasien {item.status_pasien}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold whitespace-nowrap text-center">
                      {item.jenis_kelamin === 'L' ? <span className="text-sky-600">Laki-Laki</span> : <span className="text-rose-500">Perempuan</span>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="font-bold text-slate-700">{item.usia} th</span>
                      <p className="text-slate-400 text-[11px]">{item.rentang_usia}</p>
                    </td>
                    <td className="px-4 py-3.5 min-w-[140px] text-left">
                      <span className="font-bold text-slate-800">{item.nama_poli}</span>
                      <p className="text-slate-400 text-[11px]">{item.nama_dokter}</p>
                    </td>
                    <td className="px-4 py-3.5 font-extrabold whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${
                        item.penjamin === 'BPJS/JKN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.penjamin}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-left">{item.tindakan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

