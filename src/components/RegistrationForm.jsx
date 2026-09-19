import React, { useState, useEffect } from 'react';
import { UserPlus, Search, CheckCircle2, AlertCircle, Calendar, Clock, Stethoscope, FileText, UserCheck, Shield, Sparkles } from 'lucide-react';
import { realtime } from '../utils/realtime';

export default function RegistrationForm({ onSuccess }) {
  const [isPasienBaru, setIsPasienBaru] = useState(true);
  const [poliList, setPoliList] = useState([]);
  const [dokterList, setDokterList] = useState([]);
  
  // Quick Search Pasien Lama
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPasien, setSelectedPasien] = useState(null);

  // Form Pasien Baru
  const [pasienBaruForm, setPasienBaruForm] = useState({
    nama: '',
    nik: '',
    no_bpjs: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    alamat: '',
    no_hp: '',
    custom_no_rm: ''
  });

  // Form Data Kunjungan
  const [kunjunganForm, setKunjunganForm] = useState({
    tanggal_kunjungan: new Date().toISOString().split('T')[0],
    waktu_kunjungan: new Date().toTimeString().split(' ')[0].substring(0, 5),
    poli_id: '',
    dokter_id: '',
    penjamin: 'BPJS/JKN',
    no_kartu_penjamin: '',
    tindakan: 'Pemeriksaan Medis & Konsultasi',
    catatan: ''
  });

  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Load Master Poli & Dokter
  useEffect(() => {
    fetch('/api/master')
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setPoliList(res.poli);
          setDokterList(res.dokter);
          if (res.poli.length > 0) {
            setKunjunganForm(prev => ({ ...prev, poli_id: res.poli[0].id }));
          }
        }
      });
  }, []);

  // Filter Dokter saat Poli berubah
  const filteredDokter = dokterList.filter(
    d => !kunjunganForm.poli_id || d.poli_id === Number(kunjunganForm.poli_id)
  );

  useEffect(() => {
    if (filteredDokter.length > 0 && !filteredDokter.some(d => d.id === Number(kunjunganForm.dokter_id))) {
      setKunjunganForm(prev => ({ ...prev, dokter_id: filteredDokter[0].id }));
    }
  }, [kunjunganForm.poli_id, dokterList]);

  // Search Pasien Lama
  useEffect(() => {
    if (!isPasienBaru && searchQuery.trim().length >= 2) {
      fetch(`/api/pasien?search=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) setSearchResults(res.data);
        });
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, isPasienBaru]);

  // Handler Submit Pendaftaran Kunjungan
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertMsg(null);

    try {
      let targetPasienId = null;

      if (isPasienBaru) {
        // Step 1: Input Pasien Baru
        if (!pasienBaruForm.nama || !pasienBaruForm.tanggal_lahir) {
          setAlertMsg({ type: 'error', text: 'Nama Pasien dan Tanggal Lahir wajib diisi.' });
          setLoading(false);
          return;
        }

        const pasienRes = await fetch('/api/pasien', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pasienBaruForm)
        });
        const pasienData = await pasienRes.json();

        if (!pasienData.success) {
          setAlertMsg({ type: 'error', text: pasienData.message });
          setLoading(false);
          return;
        }

        targetPasienId = pasienData.data.id;
      } else {
        // Pasien Lama
        if (!selectedPasien) {
          setAlertMsg({ type: 'error', text: 'Silakan pilih pasien lama terlebih dahulu.' });
          setLoading(false);
          return;
        }
        targetPasienId = selectedPasien.id;
      }

      // Step 2: Input Data Kunjungan
      const visitPayload = {
        ...kunjunganForm,
        pasien_id: targetPasienId,
        no_kartu_penjamin: kunjunganForm.penjamin === 'BPJS/JKN' ? (kunjunganForm.no_kartu_penjamin || (selectedPasien?.no_bpjs || pasienBaruForm.no_bpjs)) : ''
      };

      const visitRes = await fetch('/api/kunjungan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitPayload)
      });
      const visitData = await visitRes.json();

      if (visitData.success) {
        realtime.emitChange('CREATE_KUNJUNGAN', visitData);

        setAlertMsg({
          type: 'success',
          text: `Pendaftaran berhasil! Registrasi No: ${visitData.no_registrasi} (${visitData.status_pasien === 'Baru' ? 'Pasien Baru' : 'Pasien Lama'}).`
        });

        // Reset form
        setPasienBaruForm({
          nama: '', nik: '', no_bpjs: '', tanggal_lahir: '', jenis_kelamin: 'L', alamat: '', no_hp: '', custom_no_rm: ''
        });
        setSelectedPasien(null);
        setSearchQuery('');

        if (onSuccess) onSuccess();
      } else {
        setAlertMsg({ type: 'error', text: visitData.message });
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Terjadi kesalahan sistem: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Form */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Pendaftaran Kunjungan Pasien
            </h2>
            <p className="text-xs text-sky-600 font-medium mt-0.5">
              Pilih mode pendaftaran pasien baru atau pasien lama yang sudah terdaftar.
            </p>
          </div>
        </div>

        {/* Toggle Mode Pasien Baru vs Pasien Lama */}
        <div className="flex bg-sky-50/80 p-1.5 rounded-2xl border border-sky-100 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => { setIsPasienBaru(true); setSelectedPasien(null); }}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              isPasienBaru
                ? 'bg-white text-sky-700 shadow-md shadow-sky-500/10 border border-sky-100'
                : 'text-slate-500 hover:text-sky-700'
            }`}
          >
            + Pasien Baru
          </button>
          <button
            type="button"
            onClick={() => { setIsPasienBaru(false); }}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              !isPasienBaru
                ? 'bg-white text-sky-700 shadow-md shadow-sky-500/10 border border-sky-100'
                : 'text-slate-500 hover:text-sky-700'
            }`}
          >
            Cari Pasien Lama
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl text-sm font-semibold flex items-center space-x-3 shadow-xs ${
          alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 1: DATA PASIEN */}
        <div className="bg-white p-7 rounded-3xl border border-sky-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-sky-100/70 pb-3.5">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <span>1. Data Identitas Pasien</span>
            </h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
              {isPasienBaru ? 'Pasien Baru' : 'Pasien Lama'}
            </span>
          </div>

          {/* Mode Pasien Baru */}
          {isPasienBaru ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap Pasien <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Andi Pratama"
                  value={pasienBaruForm.nama}
                  onChange={(e) => setPasienBaruForm({ ...pasienBaruForm, nama: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Rekam Medis (Opsional / Custom)
                </label>
                <input
                  type="text"
                  placeholder="Biarkan kosong untuk Auto RM (RM-2026-XXXX)"
                  value={pasienBaruForm.custom_no_rm}
                  onChange={(e) => setPasienBaruForm({ ...pasienBaruForm, custom_no_rm: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none bg-sky-50/30 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Lahir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={pasienBaruForm.tanggal_lahir}
                  onChange={(e) => setPasienBaruForm({ ...pasienBaruForm, tanggal_lahir: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jenis Kelamin <span className="text-rose-500">*</span>
                </label>
                <select
                  value={pasienBaruForm.jenis_kelamin}
                  onChange={(e) => setPasienBaruForm({ ...pasienBaruForm, jenis_kelamin: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                >
                  <option value="L">Laki-Laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  placeholder="0812xxxxxxxx"
                  value={pasienBaruForm.no_hp}
                  onChange={(e) => setPasienBaruForm({ ...pasienBaruForm, no_hp: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Tempat Tinggal</label>
                <input
                  type="text"
                  placeholder="Jl. Jati Asih No..."
                  value={pasienBaruForm.alamat}
                  onChange={(e) => setPasienBaruForm({ ...pasienBaruForm, alamat: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                />
              </div>
            </div>
          ) : (
            /* Mode Pasien Lama - Search & Auto-Select */
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cari Pasien Lama (Ketik Nama / No. RM)
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-sky-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Ketik minimal 2 karakter, contoh: Andi atau RM-2026-..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Dropdown Live Results */}
              {searchResults.length > 0 && (
                <div className="bg-white border border-sky-100 rounded-2xl shadow-lg divide-y divide-sky-50 max-h-56 overflow-y-auto">
                  {searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPasien(p); setSearchResults([]); setSearchQuery(p.nama); }}
                      className="p-3.5 hover:bg-sky-50/80 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div>
                        <span className="font-bold text-slate-800 text-sm group-hover:text-sky-700">{p.nama}</span>
                        <span className="text-xs text-sky-700 ml-2 font-mono bg-sky-100/80 px-2 py-0.5 rounded-md font-bold">{p.no_rm}</span>
                        <p className="text-xs text-slate-500 mt-0.5">Lahir: {p.tanggal_lahir}</p>
                      </div>
                      <span className="text-xs font-extrabold text-sky-600 bg-white px-3 py-1.5 rounded-lg border border-sky-100 group-hover:bg-sky-600 group-hover:text-white transition-all">Pilih &rarr;</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Pasien Card */}
              {selectedPasien && (
                <div className="bg-gradient-to-r from-sky-50 to-blue-50/60 border border-sky-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-sky-600 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-md border border-sky-200">Pasien Terpilih</span>
                    <h4 className="text-base font-black text-slate-800 mt-1">{selectedPasien.nama} <span className="font-mono text-sky-700 text-sm">({selectedPasien.no_rm})</span></h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Gender: {selectedPasien.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'} &bull; Lahir: {selectedPasien.tanggal_lahir}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPasien(null)}
                    className="text-xs text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-bold transition-all"
                  >
                    Ganti Pasien
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: DATA KUNJUNGAN */}
        <div className="bg-white p-7 rounded-3xl border border-sky-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-sky-100/70 pb-3.5">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span>2. Data Kunjungan & Poli Tujuan</span>
            </h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700"></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tanggal & Waktu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Kunjungan</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-sky-500 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  value={kunjunganForm.tanggal_kunjungan}
                  onChange={(e) => setKunjunganForm({ ...kunjunganForm, tanggal_kunjungan: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Waktu Kunjungan</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-sky-500 absolute left-3.5 top-3" />
                <input
                  type="time"
                  required
                  value={kunjunganForm.waktu_kunjungan}
                  onChange={(e) => setKunjunganForm({ ...kunjunganForm, waktu_kunjungan: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Pelayanan / Poli */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Poli Tujuan <span className="text-rose-500">*</span></label>
              <select
                required
                value={kunjunganForm.poli_id}
                onChange={(e) => setKunjunganForm({ ...kunjunganForm, poli_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
              >
                {poliList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama_poli}</option>
                ))}
              </select>
            </div>

            {/* Dokter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Dokter Pemeriksa <span className="text-rose-500">*</span></label>
              <select
                required
                value={kunjunganForm.dokter_id}
                onChange={(e) => setKunjunganForm({ ...kunjunganForm, dokter_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
              >
                {filteredDokter.map(d => (
                  <option key={d.id} value={d.id}>{d.nama_dokter} ({d.spesialisasi})</option>
                ))}
              </select>
            </div>

            {/* Penjamin */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Penjamin / Pembayaran <span className="text-rose-500">*</span></label>
              <select
                required
                value={kunjunganForm.penjamin}
                onChange={(e) => setKunjunganForm({ ...kunjunganForm, penjamin: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
              >
                <option value="BPJS/JKN">BPJS / JKN</option>
                <option value="Umum">Umum</option>
              </select>
            </div>

            {/* Tindakan */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tindakan / Pelayanan Medis</label>
              <input
                type="text"
                placeholder="Contoh: Pemeriksaan Umum, Imunisasi, Penambalan Gigi..."
                value={kunjunganForm.tindakan}
                onChange={(e) => setKunjunganForm({ ...kunjunganForm, tindakan: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
              />
            </div>

            {/* Catatan Medis */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Catatan Keluhan / Administrasi</label>
              <textarea
                rows={2}
                placeholder="Keluhan pasien atau catatan administrasi..."
                value={kunjunganForm.catatan}
                onChange={(e) => setKunjunganForm({ ...kunjunganForm, catatan: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
              />
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-9 py-3.5 bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 text-white font-extrabold rounded-2xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 hover:scale-[1.01] active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2.5"
          >
            {loading ? (
              <span>Menyimpan Pendaftaran...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>SIMPAN DATA</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

