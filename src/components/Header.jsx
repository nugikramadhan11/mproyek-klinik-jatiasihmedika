import React from 'react';
import { LayoutDashboard, UserPlus, ClipboardList, FileBarChart } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pendaftaran', label: 'Pendaftaran', icon: UserPlus },
    { id: 'riwayat', label: 'Data Kunjungan', icon: ClipboardList },
    { id: 'laporan', label: 'Laporan & Rekap', icon: FileBarChart },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-sky-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 group cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <img 
              src="/logo.png" 
              alt="Logo Klinik Utama Jati Asih Medika" 
              className="w-12 h-12 rounded-full object-cover shadow-md ring-2 ring-sky-100 transition-all duration-300 group-hover:scale-105 shrink-0" 
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none group-hover:text-sky-700 transition-colors whitespace-nowrap">
                KLINIK UTAMA JATI ASIH MEDIKA
              </h1>
              <p className="text-[11px] text-sky-600 font-bold tracking-wide whitespace-nowrap mt-1">
                Sistem Pendaftaran & Rekapitulasi Pasien
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-sky-50/80 p-1.5 rounded-2xl border border-sky-100/80 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-sky-700 shadow-md shadow-sky-500/10 border border-sky-100 font-extrabold'
                      : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex overflow-x-auto pb-3 pt-1 space-x-2 scrollbar-none border-t border-sky-100/60 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'bg-sky-50 text-slate-700 hover:bg-sky-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
