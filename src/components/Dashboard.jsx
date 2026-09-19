import React, { useEffect, useState } from 'react';
import { Users, UserCheck, ShieldCheck, UserPlus, HeartPulse, PieChart as PieIcon, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { realtime } from '../utils/realtime';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/rekapitulasi');
      const result = await res.json();
      if (result.success) {
        setData(result.summary);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const unsubscribe = realtime.subscribe(() => {
      fetchDashboardData();
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-100 border-t-sky-600"></div>
        <p className="text-sm font-semibold text-sky-700 animate-pulse">Memuat Data Rekapitulasi Klinik...</p>
      </div>
    );
  }

  if (!data) return null;

  // Chart Data & Style Configurations
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
          label: (context) => ` Jumlah: ${context.raw} Pasien`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
          color: '#64748b',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
        },
        grid: {
          color: '#f1f5f9',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: '#475569',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          maxRotation: 0,
          minRotation: 0
        },
        grid: {
          display: false
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
          color: '#334155'
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
        padding: 12,
        cornerRadius: 12
      }
    }
  };

  const statusChartData = {
    labels: ['Pasien Baru', 'Pasien Lama'],
    datasets: [{
      data: [data.statusCounts?.Baru || 0, data.statusCounts?.Lama || 0],
      backgroundColor: ['#1d4ed8', '#93c5fd'],
      hoverOffset: 6,
      borderWidth: 0
    }]
  };

  const penjaminChartData = {
    labels: ['Umum', 'BPJS / JKN'],
    datasets: [{
      data: [data.penjaminCounts?.Umum || 0, data.penjaminCounts?.['BPJS/JKN'] || 0],
      backgroundColor: ['#10b981', '#6366f1'],
      hoverOffset: 6,
      borderWidth: 0
    }]
  };

  const genderChartData = {
    labels: ['Laki-Laki (L)', 'Perempuan (P)'],
    datasets: [{
      data: [data.genderCounts?.L || 0, data.genderCounts?.P || 0],
      backgroundColor: ['#0284c7', '#f43f5e'],
      hoverOffset: 6,
      borderWidth: 0
    }]
  };

  const ageChartData = {
    labels: Object.keys(data.ageGroupCounts || {}),
    datasets: [{
      label: 'Jumlah Pasien',
      data: Object.values(data.ageGroupCounts || {}),
      backgroundColor: [
        '#f59e0b', '#10b981', '#06b6d4', '#0284c7', '#3b82f6',
        '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
      ],
      hoverBackgroundColor: [
        '#d97706', '#059669', '#0891b2', '#0369a1', '#2563eb',
        '#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#e11d48'
      ],
      borderRadius: 6,
      maxBarThickness: 36
    }]
  };

  const poliColors = ['#0284c7', '#06b6d4', '#10b981', '#6366f1', '#8b5cf6', '#f59e0b'];
  const poliChartEntries = Object.entries(data.poliCounts || {}).map(([label, value], index) => ({
    label,
    value,
    color: poliColors[index % poliColors.length]
  }));

  const poliChartData = {
    labels: poliChartEntries.map(item => item.label),
    datasets: [{
      label: 'Jumlah Kunjungan',
      data: poliChartEntries.map(item => item.value),
      backgroundColor: poliChartEntries.map(item => item.color),
      hoverBackgroundColor: poliChartEntries.map(item => item.color),
      borderRadius: 8,
      maxBarThickness: 42
    }]
  };

  return (
    <div className="space-y-7">
      
      {/* Banner / Greeting */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 rounded-3xl p-7 text-white shadow-lg shadow-sky-500/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dashboard Rekapitulasi Klinik
          </h2>
          <p className="text-sky-100 text-sm max-w-xl leading-relaxed">
            Pemantauan statistik real-time pendaftaran pasien, status riwayat kunjungan, penjamin, dan demografi Klinik Utama Jati Asih Medika.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Kunjungan */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kunjungan</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{data.totalKunjungan}</h3>
            <span className="text-xs text-sky-600 font-semibold mt-1 inline-block bg-sky-50 px-2 py-0.5 rounded-md">Semua Pasien</span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors duration-200 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Pasien Baru vs Lama */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Pasien</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-sky-600">{data.statusCounts?.Baru || 0}</span>
              <span className="text-xs text-slate-400 font-semibold">Baru</span>
              <span className="text-slate-300">/</span>
              <span className="text-2xl font-black text-slate-700">{data.statusCounts?.Lama || 0}</span>
              <span className="text-xs text-slate-400 font-semibold">Lama</span>
            </div>
            <span className="text-xs text-sky-700 font-semibold mt-1 inline-block bg-sky-50 px-2 py-0.5 rounded-md">Status Riwayat</span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors duration-200 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Penjamin BPJS vs Umum */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penjamin Pasien</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-indigo-600">{data.penjaminCounts?.['BPJS/JKN'] || 0}</span>
              <span className="text-xs text-slate-400 font-semibold">BPJS</span>
              <span className="text-slate-300">/</span>
              <span className="text-2xl font-black text-emerald-600">{data.penjaminCounts?.Umum || 0}</span>
              <span className="text-xs text-slate-400 font-semibold">Umum</span>
            </div>
            <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block bg-emerald-50 px-2 py-0.5 rounded-md">Filter Penjamin</span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Gender Laki / Perempuan */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demografi Gender</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-sky-600">{data.genderCounts?.L || 0}</span>
              <span className="text-xs text-slate-400 font-semibold">L</span>
              <span className="text-slate-300">/</span>
              <span className="text-2xl font-black text-rose-500">{data.genderCounts?.P || 0}</span>
              <span className="text-xs text-slate-400 font-semibold">P</span>
            </div>
            <span className="text-xs text-rose-700 font-semibold mt-1 inline-block bg-rose-50 px-2 py-0.5 rounded-md">Jenis Kelamin</span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors duration-200 shrink-0">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Visualisation Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Doughnut: Pasien Baru vs Pasien Lama */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <PieIcon className="w-4 h-4" />
              </div>
              <span>Pasien Baru dan Lama</span>
            </h3>
            <span className="text-xs font-bold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-100">Status Pasien</span>
          </div>
          <div className="w-48 h-48 mx-auto my-2">
            <Doughnut data={statusChartData} options={doughnutOptions} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-around text-center">
            <div className="bg-sky-50/70 px-4 py-2 rounded-xl border border-sky-100/60 w-full mr-1.5">
              <p className="font-black text-sky-600 text-base">{data.statusCounts?.Baru || 0}</p>
              <p className="font-semibold text-slate-600 text-[11px]">Pasien Baru</p>
            </div>
            <div className="bg-sky-50/70 px-4 py-2 rounded-xl border border-sky-100/60 w-full ml-1.5">
              <p className="font-black text-sky-800 text-base">{data.statusCounts?.Lama || 0}</p>
              <p className="font-semibold text-slate-600 text-[11px]">Pasien Lama</p>
            </div>
          </div>
        </div>

        {/* Pie: Penjamin Umum vs BPJS/JKN */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>Distribusi Penjamin</span>
            </h3>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">Kategori Penjamin</span>
          </div>
          <div className="w-48 h-48 mx-auto my-2">
            <Pie data={penjaminChartData} options={doughnutOptions} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-around text-center">
            <div className="bg-emerald-50/70 px-4 py-2 rounded-xl border border-emerald-100/60 w-full mr-1.5">
              <p className="font-black text-emerald-600 text-base">{data.penjaminCounts?.Umum || 0}</p>
              <p className="font-semibold text-slate-600 text-[11px]">Umum</p>
            </div>
            <div className="bg-indigo-50/70 px-4 py-2 rounded-xl border border-indigo-100/60 w-full ml-1.5">
              <p className="font-black text-indigo-600 text-base">{data.penjaminCounts?.['BPJS/JKN'] || 0}</p>
              <p className="font-semibold text-slate-600 text-[11px]">BPJS / JKN</p>
            </div>
          </div>
        </div>

        {/* Doughnut: Gender L/P */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span>Jenis Kelamin</span>
            </h3>
            <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-100">Demografi Gender</span>
          </div>
          <div className="w-48 h-48 mx-auto my-2">
            <Doughnut data={genderChartData} options={doughnutOptions} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-around text-center">
            <div className="bg-sky-50/70 px-4 py-2 rounded-xl border border-sky-100/60 w-full mr-1.5">
              <p className="font-black text-sky-600 text-base">{data.genderCounts?.L || 0}</p>
              <p className="font-semibold text-slate-600 text-[11px]">Laki-Laki</p>
            </div>
            <div className="bg-rose-50/70 px-4 py-2 rounded-xl border border-rose-100/60 w-full ml-1.5">
              <p className="font-black text-rose-500 text-base">{data.genderCounts?.P || 0}</p>
              <p className="font-semibold text-slate-600 text-[11px]">Perempuan</p>
            </div>
          </div>
        </div>

      </div>

      {/* Bar Charts Row: Rentang Usia & Per Poli */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: Rentang Usia Pasien */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>Rekapitulasi Berdasarkan Rentang Usia</span>
            </h3>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">Kelompok Usia</span>
          </div>
          <div className="h-64">
            <Bar data={ageChartData} options={barOptions} />
          </div>
        </div>

        {/* Bar Chart: Kunjungan per Poli / Pelayanan */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>Kunjungan per Poli / Pelayanan</span>
            </h3>
            <span className="text-xs font-bold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-100">Pelayanan Medis</span>
          </div>
          <div className="h-64">
            <Bar data={poliChartData} options={barOptions} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Keterangan Poli</span>
              <span className="text-[10px] text-slate-500">Jumlah kunjungan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {poliChartEntries.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{item.label}</span>
                  <span className="ml-auto text-[11px] font-black text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

