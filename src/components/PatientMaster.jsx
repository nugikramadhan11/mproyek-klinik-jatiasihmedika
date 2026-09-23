import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, MapPin, Calendar, ArrowRight, X, FileText, UserCheck, ShieldCheck, Stethoscope, Hash, User } from 'lucide-react';

export default function PatientMaster({ onSelectPasien }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected Patient Detail Modal State
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState(null);
  const [patientVisits, setPatientVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pasien?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search]);

  // Open detail modal and fetch visit history for selected patient
  const handleOpenDetail = async (patient) => {
    setSelectedPatientForDetail(patient);
    setLoadingVisits(true);
    try {
      const res = await fetch(`/api/kunjungan?search=${encodeURIComponent(patient.no_rm)}`);
      const data = await res.json();
      if (data.success) {
        setPatientVisits(data.data);
      }
    } catch (err) {
      console.error('Error fetching patient visits:', err);
    } finally {
      setLoadingVisits(false);
    }
  };

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

  return (
    <div className="space-y-6">
      
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Master Database Pasien
            </h2>
            <p className="text-xs text-sky-600 font-medium mt-0.5">
              Direktori seluruh pasien terdaftar dan rincian data detail pasien.
            </p>
          </div>
        </div>

        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-sky-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari Nama Pasien, NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="p-12 text-center text-sky-600 font-semibold animate-pulse">Memuat database pasien...</div>
      ) : patients.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-white rounded-3xl border border-sky-100">
          Tidak ada data pasien terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5 flex flex-col justify-between group">
              
              <div className="space-y-3">
                <div className="flex items-start justify-between border-b border-sky-100/70 pb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-800 text-base group-hover:text-sky-700 transition-colors leading-snug">{p.nama}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap inline-flex items-center shrink-0 ${
                    p.jenis_kelamin === 'L' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {p.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Tgl Lahir: <strong className="text-slate-800">{p.tanggal_lahir}</strong> ({getAge(p.tanggal_lahir)} th)</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-sky-100/70 flex justify-end">
                <button
                  onClick={() => handleOpenDetail(p)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 bg-sky-50/80 hover:bg-sky-100 px-3.5 py-1.5 rounded-xl border border-sky-100 transition-all flex items-center space-x-1.5 group-hover:bg-sky-600 group-hover:text-white"
                >
                  <span>Detail Pasien</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL DETAIL PASIEN LENGKAP */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-7 shadow-2xl border border-sky-100 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center space-x-2">
                    <span>{selectedPatientForDetail.nama}</span>
                  </h3>
                  <p className="text-xs text-sky-600 font-medium mt-0.5">Rincian Lengkap Data Pasien & Riwayat Kunjungan Klinik</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Informasi Identitas */}
            <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 space-y-3">
              <h4 className="text-xs font-extrabold text-sky-800 uppercase tracking-wider">Identitas & Kontak Pasien</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Nama Lengkap:</span>
                  <span className="font-bold text-slate-800">{selectedPatientForDetail.nama}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Jenis Kelamin:</span>
                  <span className="font-bold text-slate-800">{selectedPatientForDetail.jenis_kelamin === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Jenis Kelamin:</span>
                  <span className="font-bold text-slate-800">{selectedPatientForDetail.jenis_kelamin === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Tanggal Lahir & Usia:</span>
                  <span className="font-bold text-slate-800">{selectedPatientForDetail.tanggal_lahir} ({getAge(selectedPatientForDetail.tanggal_lahir)} Tahun)</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Tanggal Lahir & Usia:</span>
                  <span className="font-bold text-slate-800">{selectedPatientForDetail.tanggal_lahir} ({getAge(selectedPatientForDetail.tanggal_lahir)} Tahun)</span>
                </div>
              </div>
            </div>

            {/* Section 2: Riwayat Kunjungan Pasien */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Riwayat Kunjungan di Klinik</h4>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                  Total {patientVisits.length} Kunjungan
                </span>
              </div>

              {loadingVisits ? (
                <div className="p-8 text-center text-xs text-sky-600 font-semibold animate-pulse">Memuat riwayat kunjungan...</div>
              ) : patientVisits.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                  Belum ada riwayat kunjungan tercatat untuk pasien ini.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {patientVisits.map((v, idx) => (
                    <div key={v.id || idx} className="p-3.5 bg-white rounded-2xl border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-sky-50/40 transition">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-800">{v.no_registrasi}</span>
                          <span className="text-[11px] text-slate-400">&bull; {v.tanggal_kunjungan}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            v.status_pasien === 'Baru' ? 'bg-sky-100 text-sky-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {v.status_pasien}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-sky-700">{v.nama_poli} &bull; <span className="text-slate-600 font-normal">{v.nama_dokter}</span></p>
                        <p className="text-xs text-slate-500">Tindakan: {v.tindakan || '-'}</p>
                      </div>

                      <span className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 ${
                        v.penjamin === 'BPJS/JKN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {v.penjamin}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-sky-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatientForDetail(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition text-xs"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
