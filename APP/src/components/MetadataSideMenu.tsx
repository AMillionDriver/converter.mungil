import { useState, useEffect, type ChangeEvent } from 'react';
import type { ExifData, ExifResult } from '../engines/image/exif-engine';

const LOCATION_PRESETS = [
  { name: 'Jakarta, Indonesia', lat: -6.2088, long: 106.8456 },
  { name: 'Bandung, Indonesia', lat: -6.9175, long: 107.6191 },
  { name: 'Surabaya, Indonesia', lat: -7.2575, long: 112.7521 },
  { name: 'Denpasar / Bali, Indonesia', lat: -8.6705, long: 115.2126 },
  { name: 'Yogyakarta, Indonesia', lat: -7.7956, long: 110.3695 },
  { name: 'Tokyo, Jepang', lat: 35.6762, long: 139.6503 },
  { name: 'Singapore', lat: 1.3521, long: 103.8198 },
  { name: 'London, UK', lat: 51.5074, long: -0.1278 },
  { name: 'New York, USA', lat: 40.7128, long: -74.006 },
];

const DEVICE_PRESETS = [
  {
    label: 'Apple iPhone 15 Pro Max',
    make: 'Apple',
    model: 'iPhone 15 Pro Max',
    software: 'iOS 18.0',
  },
  {
    label: 'Apple iPhone 14 Pro',
    make: 'Apple',
    model: 'iPhone 14 Pro',
    software: 'iOS 17.5',
  },
  {
    label: 'Samsung Galaxy S24 Ultra',
    make: 'Samsung',
    model: 'Galaxy S24 Ultra',
    software: 'One UI 6.1',
  },
  {
    label: 'Google Pixel 9 Pro',
    make: 'Google',
    model: 'Pixel 9 Pro',
    software: 'Android 15',
  },
  {
    label: 'Sony Alpha A7 IV',
    make: 'Sony',
    model: 'ILCE-7M4',
    software: 'Ver. 3.01',
  },
  {
    label: 'Canon EOS R5',
    make: 'Canon',
    model: 'Canon EOS R5',
    software: 'Firmware 1.8.1',
  },
  {
    label: 'Fujifilm X-T5',
    make: 'FUJIFILM',
    model: 'X-T5',
    software: 'Digital Camera X-T5 Ver.2.00',
  },
  {
    label: 'Nikon Z8',
    make: 'NIKON CORPORATION',
    model: 'NIKON Z 8',
    software: 'Ver. 2.00',
  },
];

interface MetadataSideMenuProps {
  metadata: ExifResult | null;
  editedExif: ExifData;
  isLoading: boolean;
  hasChanges: boolean;
  onUpdateField: (key: string, value: string) => void;
  onUpdateCoordinates: (lat?: number, long?: number, alt?: number) => void;
  onUpdateDevice?: (make: string, model: string, software: string) => void;
  onRemoveGps: () => void;
  onStripAll: () => void;
  onReset: () => void;
}

export function MetadataSideMenu({
  metadata,
  editedExif,
  isLoading,
  hasChanges,
  onUpdateField,
  onUpdateCoordinates,
  onUpdateDevice,
  onRemoveGps,
  onStripAll,
  onReset,
}: MetadataSideMenuProps) {
  const [latInput, setLatInput] = useState<string>(
    editedExif.GPSLatitude !== undefined ? String(editedExif.GPSLatitude) : ''
  );
  const [longInput, setLongInput] = useState<string>(
    editedExif.GPSLongitude !== undefined ? String(editedExif.GPSLongitude) : ''
  );
  const [selectedLocationPreset, setSelectedLocationPreset] =
    useState<string>('');
  const [selectedDevicePreset, setSelectedDevicePreset] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const matchDevice = DEVICE_PRESETS.find(
      (d) =>
        d.make.toLowerCase() === String(editedExif.Make || '').toLowerCase() &&
        d.model.toLowerCase() === String(editedExif.Model || '').toLowerCase()
    );
    if (matchDevice) {
      setSelectedDevicePreset(matchDevice.label);
    } else {
      setSelectedDevicePreset('');
    }
  }, [editedExif.Make, editedExif.Model]);

  useEffect(() => {
    setLatInput(
      editedExif.GPSLatitude !== undefined ? String(editedExif.GPSLatitude) : ''
    );
    setLongInput(
      editedExif.GPSLongitude !== undefined ? String(editedExif.GPSLongitude) : ''
    );
    const matching = LOCATION_PRESETS.find(
      (p) =>
        typeof editedExif.GPSLatitude === 'number' &&
        typeof editedExif.GPSLongitude === 'number' &&
        Math.abs(p.lat - editedExif.GPSLatitude) < 0.0001 &&
        Math.abs(p.long - editedExif.GPSLongitude) < 0.0001
    );
    if (matching) {
      setSelectedLocationPreset(matching.name);
    } else if (
      editedExif.GPSLatitude === undefined &&
      editedExif.GPSLongitude === undefined
    ) {
      setSelectedLocationPreset('');
    }
  }, [editedExif.GPSLatitude, editedExif.GPSLongitude]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="size-4 animate-spin text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-sm font-semibold text-slate-800">
            Membaca Metadata & EXIF...
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Memindai data tersembunyi dari file gambar.
        </p>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  const hasGps =
    editedExif.GPSLatitude !== undefined ||
    editedExif.GPSLongitude !== undefined;

  const handleInputChange = (
    key: string,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onUpdateField(key, e.target.value);
  };

  const handleLatChange = (val: string) => {
    setLatInput(val);
    setSelectedLocationPreset('');
    const trimmed = val.trim();
    if (trimmed === '') {
      onUpdateCoordinates(
        undefined,
        typeof editedExif.GPSLongitude === 'number'
          ? editedExif.GPSLongitude
          : undefined
      );
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= -90 && num <= 90) {
        onUpdateCoordinates(
          num,
          typeof editedExif.GPSLongitude === 'number'
            ? editedExif.GPSLongitude
            : undefined
        );
      }
    }
  };

  const handleLongChange = (val: string) => {
    setLongInput(val);
    setSelectedLocationPreset('');
    const trimmed = val.trim();
    if (trimmed === '') {
      onUpdateCoordinates(
        typeof editedExif.GPSLatitude === 'number'
          ? editedExif.GPSLatitude
          : undefined,
        undefined
      );
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= -180 && num <= 180) {
        onUpdateCoordinates(
          typeof editedExif.GPSLatitude === 'number'
            ? editedExif.GPSLatitude
            : undefined,
          num
        );
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Fitur Geolocation tidak didukung di peramban ini.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const long = Number(pos.coords.longitude.toFixed(6));
        setLatInput(String(lat));
        setLongInput(String(long));
        setSelectedLocationPreset('Lokasi Perangkat Anda');
        onUpdateCoordinates(lat, long);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert(`Gagal mendeteksi lokasi: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  const handleSelectPreset = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const selected = LOCATION_PRESETS.find((p) => p.name === val);
    if (selected) {
      setSelectedLocationPreset(selected.name);
      setLatInput(String(selected.lat));
      setLongInput(String(selected.long));
      onUpdateCoordinates(selected.lat, selected.long);
    } else {
      setSelectedLocationPreset('');
    }
  };

  const handleSelectDevicePreset = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const chosen = DEVICE_PRESETS.find((d) => d.label === val);
    if (chosen) {
      setSelectedDevicePreset(chosen.label);
      if (onUpdateDevice) {
        onUpdateDevice(chosen.make, chosen.model, chosen.software);
      } else {
        onUpdateField('Make', chosen.make);
        onUpdateField('Model', chosen.model);
        onUpdateField('Software', chosen.software);
      }
    } else {
      setSelectedDevicePreset('');
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <svg
            className="size-4 text-indigo-600"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Metadata & EXIF
          </h2>
        </div>
        {hasChanges && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
            Ada Perubahan
          </span>
        )}
      </div>

      {/* 1. Ringkasan File (Read-Only) */}
      <div className="space-y-1.5 text-xs">
        <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
          Informasi File
        </span>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Resolusi:</span>
          <span className="font-medium text-slate-800">
            {metadata.width && metadata.height
              ? `${metadata.width} × ${metadata.height} px`
              : 'Tidak terdeteksi'}
          </span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Ukuran:</span>
          <span className="font-medium text-slate-800">
            {(metadata.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Tipe MIME:</span>
          <span className="font-medium text-slate-800">{metadata.format}</span>
        </div>
      </div>

      {/* 2. Informasi & Kustomisasi Perangkat Kamera */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
            Perangkat & Kamera
          </span>
          {(editedExif.Make || editedExif.Model) && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200 truncate max-w-[130px]">
              {editedExif.Make || 'Kustom'}
            </span>
          )}
        </div>

        {/* Preset Perangkat Dropdown */}
        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-1">
            Pilih Preset Perangkat
          </label>
          <select
            value={selectedDevicePreset}
            onChange={handleSelectDevicePreset}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">-- Pilih Preset Perangkat --</option>
            {DEVICE_PRESETS.map((device) => (
              <option key={device.label} value={device.label}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        {selectedDevicePreset && (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
            <svg
              className="size-3.5 text-indigo-600 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
              />
            </svg>
            <span className="font-semibold truncate">
              {selectedDevicePreset}
            </span>
          </div>
        )}

        {/* Inputs Make, Model, Software */}
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
              Merek Kamera / HP
            </label>
            <input
              type="text"
              value={editedExif.Make || ''}
              onChange={(e) => {
                setSelectedDevicePreset('');
                onUpdateField('Make', e.target.value);
              }}
              placeholder="Contoh: Apple, Sony, Canon"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
              Model Perangkat
            </label>
            <input
              type="text"
              value={editedExif.Model || ''}
              onChange={(e) => {
                setSelectedDevicePreset('');
                onUpdateField('Model', e.target.value);
              }}
              placeholder="Contoh: iPhone 15 Pro, ILCE-7M4"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
              Perangkat Lunak / OS (Software)
            </label>
            <input
              type="text"
              value={editedExif.Software || ''}
              onChange={(e) => {
                setSelectedDevicePreset('');
                onUpdateField('Software', e.target.value);
              }}
              placeholder="Contoh: iOS 18.1, One UI 6.0"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 3. Privasi & Lokasi GPS Kustom */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
            Lokasi & Koordinat (GPS)
          </span>
          {hasGps ? (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
              GPS Aktif
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
              Tanpa GPS
            </span>
          )}
        </div>

        {/* Inputs Latitude & Longitude */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-600 mb-1">
              Latitude (-90 s/d 90)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => handleLatChange(e.target.value)}
              placeholder="-6.2088"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-600 mb-1">
              Longitude (-180 s/d 180)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={longInput}
              onChange={(e) => handleLongChange(e.target.value)}
              placeholder="106.8456"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Preset Lokasi Dropdown */}
        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-1">
            Pilih Kota Populer
          </label>
          <select
            value={selectedLocationPreset}
            onChange={handleSelectPreset}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">-- Pilih Preset Lokasi --</option>
            {LOCATION_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name} ({preset.lat}, {preset.long})
              </option>
            ))}
          </select>
        </div>

        {/* Display Selected Location Chip */}
        {selectedLocationPreset && (
          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/80 px-2.5 py-1.5 text-xs text-indigo-700">
            <svg
              className="size-3.5 text-indigo-600 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            <span className="font-semibold truncate">
              Lokasi Terpilih: {selectedLocationPreset}
            </span>
          </div>
        )}

        {/* Action Buttons: Gunakan Lokasi Saat Ini & Hapus GPS */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1 px-2 text-center text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 active:scale-98 disabled:opacity-50"
          >
            <svg
              className="size-3.5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2v3m0 14v3m10-10h-3M5 12H2"
              />
            </svg>
            <span>{isLocating ? 'Mencari...' : 'Lokasi Saya'}</span>
          </button>

          {hasGps && (
            <button
              type="button"
              onClick={onRemoveGps}
              className="flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 py-1 px-2.5 text-center text-[11px] font-medium text-rose-700 transition hover:bg-rose-100 active:scale-98"
            >
              <svg
                className="size-3 text-rose-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Hapus GPS</span>
            </button>
          )}
        </div>

        {/* Link Google Maps jika koordinat valid */}
        {hasGps &&
          typeof editedExif.GPSLatitude === 'number' &&
          typeof editedExif.GPSLongitude === 'number' && (
            <a
              href={`https://www.google.com/maps?q=${editedExif.GPSLatitude},${editedExif.GPSLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              <span>Pratinjau di Google Maps</span>
              <svg
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          )}
      </div>

      {/* 4. Field Editor (Hak Cipta & Informasi) */}
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
          Edit Hak Cipta & Deskripsi
        </span>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Fotografer / Artis
          </label>
          <input
            type="text"
            value={editedExif.Artist || ''}
            onChange={(e) => handleInputChange('Artist', e)}
            placeholder="Nama fotografer..."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Hak Cipta (Copyright)
          </label>
          <input
            type="text"
            value={editedExif.Copyright || ''}
            onChange={(e) => handleInputChange('Copyright', e)}
            placeholder="Contoh: © 2026 Mungil"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Deskripsi Gambar
          </label>
          <textarea
            rows={2}
            value={editedExif.ImageDescription || ''}
            onChange={(e) => handleInputChange('ImageDescription', e)}
            placeholder="Keterangan singkat..."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 resize-none"
          />
        </div>
      </div>

      {/* 5. Aksi Global Metadata */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onStripAll}
          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-98"
        >
          Bersihkan Semua Metadata
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={onReset}
            className="w-full text-center text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            Kembalikan ke Asli
          </button>
        )}
      </div>
    </div>
  );
}
