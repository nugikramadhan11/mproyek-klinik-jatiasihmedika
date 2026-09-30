import React, { useState } from 'react';

const tindakanGroups = [
  {
    category: 'I. PELAYANAN PEMERIKSAAN DAN KONSULTASI',
    groups: [{
      id: 'konsultasi',
      label: 'Pemeriksaan dan Konsultasi',
      options: [
        'Dokter Spesialis Anak',
        'Dokter Spesialis Kesehatan Gigi Anak',
        'Dokter Spesialis Rehabilitasi Medik',
        'Dokter Spesialis Saraf',
        'Dokter Umum',
        'Dokter Gigi Umum',
        'Telemedicine Dokter Spesialis',
        'Telemedicine Dokter Umum'
      ]
    }]
  },
  {
    category: 'II. TINDAKAN (TINDAKAN DARURAT)',
    groups: [
      { id: 'luka-bakar', label: 'Luka Bakar', options: ['Luka Bakar', 'Luka Bakar (combusio) grade 1 Ringan', 'Luka Bakar (combusio) grade 1 Sedang'] },
      { id: 'rawat-luka', label: 'Rawat Luka', options: ['Rawat Luka Ringan', 'Rawat Luka Sedang', 'Rawat Luka Besar'] },
      { id: 'jahit-luka', label: 'Jahit Luka', options: ['Jahit Luka Kecil (1-6 jahitan)', 'Jahit Luka Sedang (7-12 jahitan)'] },
      { id: 'nebulizer', label: 'Nebulizer', options: ['Nebulizer Anak', 'Nebulizer Dewasa'] },
      { id: 'pemasangan', label: 'Pemasangan', options: ['Bidai Spalk', 'Ransel Verband', 'Elastic Bandage Kecil', 'Elastic Bandage Besar', 'Infus'] },
      { id: 'lepas-jahitan', label: 'Lepas Jahitan', options: ['Lepas Jahitan Kecil', 'Lepas Jahitan Besar'] },
      { id: 'tindakan-lain', label: 'Tindakan Lain', options: ['Extracti Benda Asing Kulit', 'Extracti Kuku', 'Extracti Corpus Alienum Hidung', 'Spooling Telinga', 'Rectal Toucher', 'Incisi Abses', 'Reposisi Manual Harmohoid', 'Injeksi', 'Injeksi-Articular'] },
      { id: 'laboratorium', label: 'Laboratorium Sederhana', options: ['Gula Darah Acak', 'Cholestrol Total', 'Asam Urat', 'Paket (GDA-AU-Cho)'] },
      { id: 'surat-keterangan', label: 'Surat Keterangan', options: ['Surat Sehat', 'Surat Sakit', 'Surat Kematian'] }
    ]
  },
  {
    category: 'III. FISIOTERAPI PERKUNJUNGAN',
    groups: [
      { id: 'pasien-umum', label: 'Pasien Umum', options: ['Fisioterapi Exercise (Anak dan Dewasa)', 'Terapi Modalitas (USD, TENS, Cryo) 1 Regio', 'Terapi Modalitas (USD, TENS, Cryo) 2 Regio', 'Terapi Modalitas (USD, TENS, Cryo) 2 Alat 1 Regio', 'Terapi Kombinasi (Exc dan 1 alat)', 'Terapi Kombinasi (Exc dan 2 alat)', 'Hydroterapi Anak (<18 tahun)', 'Hydroterapi Dewasa'] },
      { id: 'pasien-anak-binaan', label: 'Pasien Anak Binaan', options: ['Fisioterapi Exercise Anak Binaan', 'Hydroterapi Anak Binaan'] }
    ]
  },
  {
    category: 'IV. HOMECARE',
    groups: [{
      id: 'homecare',
      label: 'Homecare',
      options: ['Homevisite Dokter Umum', 'Homecare Rawat Luka Kecil', 'Homecare Rawat Luka Sedang', 'Homecare Fisioterapi', 'Homecare Fisioterapi (Sabtu-Minggu)', 'Homecare Fisioterapi [SDA]', 'Homecare Fisioterapi (Sabtu-Minggu) [SDA]']
    }]
  },
  {
    category: 'V. VAKSIN',
    groups: [{
      id: 'jenis-vaksin',
      label: 'Jenis Vaksin',
      options: ['Fluarix Tetra NH. 0.5 ml', 'Hexaxim Inj', 'Imojev', 'MMR II', 'Qdenga 1 Powder Val + 1 Syr O.5ml +2 NDLS', 'Rotarix Susp', 'Typhim VI 0.5ml', 'Varivax', 'Vaxneuvance Inj 0.5ml']
    }]
  }
];

const allGroups = tindakanGroups.flatMap(section =>
  section.groups.map(group => ({ ...group, category: section.category }))
);

export const tindakanCategoryByOption = new Map([
  ...allGroups.flatMap(group => group.options.map(option => [option, group.category])),
  ['Pemeriksaan Medis & Konsultasi', tindakanGroups[0].category]
]);

export default function TindakanSelector({ value = '', onChange, required = false, compact = false }) {
  const initialGroup = allGroups.find(group => group.options.includes(value));
  const isLegacyValue = Boolean(value) && !initialGroup;
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroup?.id || (isLegacyValue ? 'legacy' : ''));
  const selectedGroup = allGroups.find(group => group.id === selectedGroupId);
  const legacyOption = selectedGroupId === 'legacy' && value ? [value] : [];
  const options = selectedGroup?.options || legacyOption;
  const fieldClassName = `w-full ${compact ? 'px-3 py-2.5' : 'px-4 py-2.5'} rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all`;

  const handleGroupChange = (event) => {
    setSelectedGroupId(event.target.value);
    onChange('');
  };

  return (
    <div className={`grid grid-cols-1 ${compact ? 'gap-2' : 'md:grid-cols-2 gap-4'}`}>
      <select
        value={selectedGroupId}
        onChange={handleGroupChange}
        className={fieldClassName}
        aria-label="Kelompok tindakan"
      >
        <option value="">Pilih kelompok pelayanan/tindakan...</option>
        {tindakanGroups.map(section => (
          <optgroup key={section.category} label={section.category}>
            {section.groups.map(group => (
              <option key={group.id} value={group.id}>{group.label}</option>
            ))}
          </optgroup>
        ))}
        {isLegacyValue && <option value="legacy">Tindakan tersimpan (data lama)</option>}
      </select>

      {selectedGroupId && (
        <select
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClassName}
          aria-label="Pilihan tindakan"
        >
          <option value="">Pilih tindakan...</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      )}
    </div>
  );
}