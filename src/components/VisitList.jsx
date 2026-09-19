import React, { useState, useEffect } from 'react';
import { Search, Edit3, Trash2, Calendar, UserCheck, ShieldCheck, Stethoscope, CheckCircle2, X, Filter } from 'lucide-react';
import { realtime } from '../utils/realtime';

export default function VisitList() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [penjaminFilter, setPenjaminFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Master lists for modal dropdowns
  const [poliList, setPoliList] = useState([]);
  const [dokterList, setDokterList] = useState([]);

  // Edit Modal state (REQ-04)
  const [editingVisit, setEditingVisit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const queryParams = {
        search,
        penjamin: penjaminFilter,
        status_pasien: statusFilter
      };
      if (dateFilter) {
        queryParams.start_date = dateFilter;
        queryParams.end_date = dateFilter;
      }
      const query = new URLSearchParams(queryParams).toString();

      const res = await fetch(`/api/kunjungan?${query}`);
      const data = await res.json();
      if (data.success) {
        setVisits(data.data);
      }
    } catch (err) {
      console.error('Error fetching visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/master')
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setPoliList(res.poli);
          setDokterList(res.dokter);
        }
      });
  }, []);

  useEffect(() => {
    fetchVisits();
    const unsubscribe = realtime.subscribe(() => {
      fetchVisits();
    });
    return () => unsubscribe();
  }, [search, penjaminFilter, statusFilter, dateFilter]);

  // Open Edit Modal (REQ-04)
  const handleEditClick = (visit) => {
    setEditingVisit(visit);
    setEditForm({
      nama_pasien: visit.nama_pasien || '',
      tanggal_kunjungan: visit.tanggal_kunjungan,
      waktu_kunjungan: visit.waktu_kunjungan,
      poli_id: visit.poli_id,
      dokter_id: visit.dokter_id,
      penjamin: visit.penjamin,
      no_kartu_penjamin: visit.no_kartu_penjamin || '',
      tindakan: visit.tindakan || '',
      catatan: visit.catatan || '',
      status_pasien: visit.status_pasien
    });
  };

  // Save Perbaikan Data (REQ-04)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/kunjungan/${editingVisit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditingVisit(null);
        fetchVisits();
        realtime.emitChange('UPDATE_KUNJUNGAN', { id: editingVisit.id });
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Gagal memperbaiki data: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Visit
  const handleDeleteVisit = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data kunjungan ini?')) return;
    try {
      const res = await fetch(`/api/kunjungan/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchVisits();
        realtime.emitChange('DELETE_KUNJUNGAN', { id });
      }
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Filters */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100/70 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Data & Riwayat Kunjungan Pasien
              </h2>
              <p className="text-xs text-sky-600 font-medium mt-0.5">
                Pencarian, filter penjamin/status, dan perbaikan data kunjungan.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 shrink-0 self-start md:self-auto">
            Total {visits.length} Kunjungan
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-sky-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari Nama Pasien, No. RM, Reg..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Calendar className="w-4 h-4 text-sky-500 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-slate-700"
              title="Filter Tanggal Kunjungan"
            />
          </div>

          <select
            value={penjaminFilter}
            onChange={(e) => setPenjaminFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
          >
            <option value="">Semua Penjamin</option>
            <option value="BPJS/JKN">BPJS / JKN</option>
            <option value="Umum">Umum</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
          >
            <option value="">Semua Status Pasien</option>
            <option value="Baru">Pasien Baru</option>
            <option value="Lama">Pasien Lama</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sky-600 font-semibold animate-pulse">Memuat data kunjungan pasien...</div>
        ) : visits.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Tidak ada data kunjungan pasien ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/80 border-b border-sky-100 text-sky-900 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4 text-center">No. Reg / Tgl</th>
                  <th className="px-4 py-4 text-left">Pasien & No. RM</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Gender / Usia</th>
                  <th className="px-4 py-4 text-left">Poli & Dokter</th>
                  <th className="px-4 py-4 text-center">Penjamin</th>
                  <th className="px-4 py-4 text-left">Tindakan</th>
                  <th className="px-4 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {visits.map(v => (
                  <tr key={v.id} className="hover:bg-sky-50/60 transition-colors duration-150">
                    
                    <td className="px-4 py-3.5 font-mono text-center">
                      <span className="font-bold text-slate-800">{v.no_registrasi}</span>
                      <p className="text-slate-400 text-[11px]">{v.tanggal_kunjungan} ({v.waktu_kunjungan})</p>
                    </td>

                    <td className="px-4 py-3.5 text-left">
                      <span className="font-extrabold text-sky-700 text-sm">{v.nama_pasien}</span>
                      <p className="text-slate-500 font-mono text-[11px]">{v.no_rm}</p>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full font-extrabold text-[11px] whitespace-nowrap shadow-xs ${
                        v.status_pasien === 'Baru'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        Pasien {v.status_pasien}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="font-bold text-slate-700">{v.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
                      <p className="text-slate-500 text-[11px]">{v.usia} th ({v.rentang_usia})</p>
                    </td>

                    <td className="px-4 py-3.5 min-w-[140px] text-left">
                      <span className="font-bold text-slate-800">{v.nama_poli}</span>
                      <p className="text-slate-500 text-[11px]">{v.nama_dokter}</p>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap ${
                        v.penjamin === 'BPJS/JKN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {v.penjamin}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-600 text-left">
                      {v.tindakan || '-'}
                    </td>

                    {/* Aksi Perbaiki Data (REQ-04) */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditClick(v)}
                          title="Perbaiki Data Kunjungan"
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition flex items-center space-x-1 font-bold active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteVisit(v.id)}
                          title="Hapus Kunjungan"
                          className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PERBAIKI DATA KUNJUNGAN (REQ-04) */}
      {editingVisit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-sky-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-sky-100 pb-3.5">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  <span>Perbaiki Data Kunjungan</span>
                </h3>
                <p className="text-xs text-sky-600 font-mono mt-0.5">{editingVisit.no_registrasi} • RM: {editingVisit.no_rm}</p>
              </div>
              <button
                onClick={() => setEditingVisit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pasien</label>
                <input
                  type="text"
                  value={editForm.nama_pasien || ''}
                  onChange={(e) => setEditForm({ ...editForm, nama_pasien: e.target.value })}
                  placeholder="Ketik nama lengkap pasien..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-bold text-sky-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Kunjungan</label>
                  <input
                    type="date"
                    value={editForm.tanggal_kunjungan}
                    onChange={(e) => setEditForm({ ...editForm, tanggal_kunjungan: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Waktu</label>
                  <input
                    type="time"
                    value={editForm.waktu_kunjungan}
                    onChange={(e) => setEditForm({ ...editForm, waktu_kunjungan: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Pasien</label>
                  <select
                    value={editForm.status_pasien}
                    onChange={(e) => setEditForm({ ...editForm, status_pasien: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-semibold"
                  >
                    <option value="Baru">Pasien Baru</option>
                    <option value="Lama">Pasien Lama</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penjamin</label>
                  <select
                    value={editForm.penjamin}
                    onChange={(e) => setEditForm({ ...editForm, penjamin: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-semibold"
                  >
                    <option value="BPJS/JKN">BPJS / JKN</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Poli / Pelayanan</label>
                  <select
                    value={editForm.poli_id}
                    onChange={(e) => setEditForm({ ...editForm, poli_id: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-semibold"
                  >
                    {poliList.map(p => (
                      <option key={p.id} value={p.id}>{p.nama_poli}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dokter</label>
                  <select
                    value={editForm.dokter_id}
                    onChange={(e) => setEditForm({ ...editForm, dokter_id: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-semibold"
                  >
                    {dokterList.map(d => (
                      <option key={d.id} value={d.id}>{d.nama_dokter}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tindakan Medis</label>
                <input
                  type="text"
                  value={editForm.tindakan}
                  onChange={(e) => setEditForm({ ...editForm, tindakan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={editForm.catatan}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-sky-600 text-white font-extrabold rounded-xl hover:bg-sky-700 shadow-md shadow-sky-500/20 transition active:scale-95"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perbaikan'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

