'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Layers,
  ShoppingBag,
  Video,
  Database
} from 'lucide-react';
import { parseAndIngestFiles, detectFileType, FileType } from '@/lib/parser';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [dateStr, setDateStr] = useState<string>('2026-11-17');
  const [storeFile, setStoreFile] = useState<File | null>(null);
  const [adsProductFile, setAdsProductFile] = useState<File | null>(null);
  const [adsLiveFile, setAdsLiveFile] = useState<File | null>(null);
  const [stockFile, setStockFile] = useState<File | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const autoDropRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle multi-file drop into master zone
  const handleMasterDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleMasterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList: File[]) => {
    fileList.forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes('live')) {
        setAdsLiveFile(file);
      } else if (name.includes('product_list')) {
        setStoreFile(file);
      } else if (name.includes('template') || name.includes('batchedit') || name.includes('sales_information')) {
        setStockFile(file);
      } else if (name.includes('product data') || name.includes('campaign') || name.includes('gmvmax')) {
        setAdsProductFile(file);
      }
    });
  };

  const handleUpload = async () => {
    if (!storeFile && !adsProductFile && !adsLiveFile && !stockFile) {
      setResultMsg({ type: 'error', text: 'Pilih setidaknya 1 file raw Excel untuk diunggah.' });
      return;
    }

    setLoading(true);
    setResultMsg(null);

    const res = await parseAndIngestFiles(
      dateStr,
      {
        storeFile,
        adsProductFile,
        adsLiveFile,
        stockFile,
      },
      (status) => setProgressMsg(status)
    );

    setLoading(false);
    if (res.success) {
      setResultMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } else {
      setResultMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-950/40">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upload File Raw TikTok GMV Max</h2>
              <p className="text-xs text-slate-400">Sinkronkan data harian langsung ke Supabase Cloud</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 py-4">
          
          {/* Tanggal Data */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Calendar className="h-4 w-4 text-rose-500" />
              <span>Tanggal Performa Data:</span>
            </div>
            <input 
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              disabled={loading}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
            />
          </div>

          {/* Master Drag & Drop Zone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleMasterDrop}
            onClick={() => autoDropRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-rose-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-950/30 hover:bg-slate-950/60"
          >
            <input 
              type="file" 
              ref={autoDropRef} 
              multiple 
              accept=".xlsx,.xls" 
              onChange={handleMasterSelect} 
              className="hidden" 
            />
            <FileSpreadsheet className="h-8 w-8 text-rose-400 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-200">
              Drop Semua File Raw Sekaligus di Sini (Auto-Detect)
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Atau klik untuk memilih beberapa file Excel (.xlsx) sekaligus
            </p>
          </div>

          {/* 4 Dedicated Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* Slot 1: Performa Toko */}
            <div className={`p-3 rounded-xl border transition-all ${storeFile ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/40 border-slate-800/80'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">1. Performa Toko</span>
                </div>
                {storeFile && <CheckCircle className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">File: product_list_*.xlsx</p>
              <input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setStoreFile(e.target.files[0])}
                className="mt-2 block w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {storeFile && <p className="text-[10px] text-emerald-400 mt-1 truncate">✓ {storeFile.name}</p>}
            </div>

            {/* Slot 2: Ads Produk GMV Max */}
            <div className={`p-3 rounded-xl border transition-all ${adsProductFile ? 'bg-indigo-950/20 border-indigo-500/40' : 'bg-slate-950/40 border-slate-800/80'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">2. Iklan GMV Max</span>
                </div>
                {adsProductFile && <CheckCircle className="h-4 w-4 text-indigo-400" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">File: Product data *.xlsx</p>
              <input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setAdsProductFile(e.target.files[0])}
                className="mt-2 block w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {adsProductFile && <p className="text-[10px] text-indigo-400 mt-1 truncate">✓ {adsProductFile.name}</p>}
            </div>

            {/* Slot 3: Live Ads */}
            <div className={`p-3 rounded-xl border transition-all ${adsLiveFile ? 'bg-purple-950/20 border-purple-500/40' : 'bg-slate-950/40 border-slate-800/80'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-slate-200">3. Iklan Live GMV Max</span>
                </div>
                {adsLiveFile && <CheckCircle className="h-4 w-4 text-purple-400" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">File: Live campaign data *.xlsx</p>
              <input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setAdsLiveFile(e.target.files[0])}
                className="mt-2 block w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {adsLiveFile && <p className="text-[10px] text-purple-400 mt-1 truncate">✓ {adsLiveFile.name}</p>}
            </div>

            {/* Slot 4: Stok Realtime */}
            <div className={`p-3 rounded-xl border transition-all ${stockFile ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-950/40 border-slate-800/80'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">4. Stok Fisik Real-time</span>
                </div>
                {stockFile && <CheckCircle className="h-4 w-4 text-amber-400" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">File: batchedit_*_sales_template.xlsx</p>
              <input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setStockFile(e.target.files[0])}
                className="mt-2 block w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {stockFile && <p className="text-[10px] text-amber-400 mt-1 truncate">✓ {stockFile.name}</p>}
            </div>

          </div>

          {/* Progress / Status Notice */}
          {loading && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center space-x-3 text-xs text-rose-400 animate-pulse">
              <div className="h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <span>{progressMsg || 'Memproses & mengunggah ke Supabase...'}</span>
            </div>
          )}

          {resultMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${resultMsg.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'}`}>
              {resultMsg.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
              <span>{resultMsg.text}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button 
            type="button" 
            onClick={handleUpload}
            disabled={loading || (!storeFile && !adsProductFile && !adsLiveFile && !stockFile)}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{loading ? 'Mengunggah...' : 'Proses & Simpan ke Cloud'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
