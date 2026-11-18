'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Target,
  BarChart3,
  Search,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Layers,
  Calendar,
  RefreshCw,
  Sliders,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  Zap,
  Upload,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { fetchMatrixData, MatrixResult } from '@/lib/matrix';
import { DynamicMatrixItem } from '@/lib/types';
import UploadModal from '@/components/UploadModal';

export default function DashboardPage() {
  // Date range states
  const [datePreset, setDatePreset] = useState<'yesterday' | '7days' | 'mtd' | 'custom'>('yesterday');
  const [startDate, setStartDate] = useState('2026-11-16');
  const [endDate, setEndDate] = useState('2026-11-16');

  // Matrix and UI states
  const [minDailyTraffic, setMinDailyTraffic] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MatrixResult | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'hero'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Handle Preset changes
  const applyPreset = (preset: 'yesterday' | '7days' | 'mtd' | 'custom') => {
    setDatePreset(preset);
    if (preset === 'yesterday') {
      setStartDate('2026-11-16');
      setEndDate('2026-11-16');
    } else if (preset === '7days') {
      setStartDate('2026-11-11');
      setEndDate('2026-11-17');
    } else if (preset === 'mtd') {
      setStartDate('2026-11-01');
      setEndDate('2026-11-17');
    }
  };

  // Fetch data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMatrixData(startDate, endDate, minDailyTraffic);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gagal memuat data dari Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, minDailyTraffic]);

  // Filtered items based on search and tab
  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      // Tab filter
      if (activeTab === 'q1' && item.kuadran_code !== 1) return false;
      if (activeTab === 'q2' && item.kuadran_code !== 2) return false;
      if (activeTab === 'q3' && item.kuadran_code !== 3) return false;
      if (activeTab === 'q4' && item.kuadran_code !== 4) return false;
      if (activeTab === 'hero' && item.pareto_tier !== 'HERO (Top 80%)') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.product_name.toLowerCase().includes(q) ||
          item.product_id.includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, activeTab, searchQuery]);

  // Scatter plot data mapping
  const scatterData = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((i) => i.visitors > 0)
      .map((item) => ({
        x: item.visitors,
        y: Math.min(item.ctor, 15), // cap at 15% for visual clarity
        realCtor: item.ctor,
        z: Math.max(item.store_gmv / 100000, 10),
        name: item.product_name,
        code: item.kuadran_code,
        item,
      }));
  }, [data]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getColorByQuadrant = (code: number) => {
    switch (code) {
      case 1:
        return '#10B981'; // Emerald (Star)
      case 2:
        return '#06B6D4'; // Cyan (Hidden Gem)
      case 3:
        return '#F59E0B'; // Amber (Bottleneck)
      default:
        return '#94A3B8'; // Slate (Dog)
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-pink-600 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">TikTok Growth Matrix</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Supabase Cloud Live
                </span>
              </div>
              <p className="text-xs text-slate-400">Dynamic Multi-Dimensional Decision Engine & BCG Matrix</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-inner">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => applyPreset('yesterday')}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  datePreset === 'yesterday'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Kemarin (16 Nov)
              </button>
              <button
                onClick={() => applyPreset('7days')}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  datePreset === '7days'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                7 Hari Terakhir
              </button>
              <button
                onClick={() => applyPreset('mtd')}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  datePreset === 'mtd'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Bulan Ini (MTD)
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            <div className="flex items-center space-x-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <span className="text-slate-500 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                onClick={loadData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Min Daily Traffic Threshold Input */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs shadow-inner" title="Garis batas pemisah Trafik Tinggi vs Rendah untuk membagi seluruh 4 Kuadran Matrix">
              <Target className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap hidden lg:inline">Ambang Trafik:</span>
              <input
                type="number"
                min={5}
                max={2000}
                step={10}
                value={minDailyTraffic}
                onChange={(e) => setMinDailyTraffic(Math.max(1, Number(e.target.value) || 10))}
                className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-slate-400 whitespace-nowrap">/hari</span>
              {(data?.summary.periodDays || 1) > 1 && (
                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                  Total: ≥{(data?.summary.effectiveTrafficThreshold || minDailyTraffic).toLocaleString('id-ID')}
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Raw</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* 1. Summary KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total GMV Toko */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total GMV Toko</span>
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {data ? formatIDR(data.summary.totalStoreGmv) : 'Rp0'}
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-400 gap-1.5">
              <span className="font-semibold text-slate-200">{data?.summary.totalStoreOrders || 0}</span> pesanan
              toko terselesaikan
            </div>
          </div>

          {/* Card 2: Belanja Iklan & GMV Iklan */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Belanja Iklan GMV Max</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {data ? formatIDR(data.summary.totalAdsSpend) : 'Rp0'}
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-400 gap-1.5">
              <span>GMV Iklan:</span>
              <span className="font-semibold text-indigo-300">
                {data ? formatIDR(data.summary.totalAdsGmv) : 'Rp0'}
              </span>
            </div>
          </div>

          {/* Card 3: Overall ROAS Toko */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Overall ROAS Iklan</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold text-white tracking-tight">
                {data?.summary.overallRoas || 0}x
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (data?.summary.overallRoas || 0) >= 8.0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : (data?.summary.overallRoas || 0) >= 7.0
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {(data?.summary.overallRoas || 0) >= 8.0
                  ? 'Target 8.0x Terpenuhi'
                  : (data?.summary.overallRoas || 0) >= 7.0
                  ? 'Di Atas Toleransi 7.0x'
                  : 'Di Bawah Toleransi'}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">Efisiensi belanja gabungan toko</div>
          </div>

          {/* Card 4: Dynamic Benchmark */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Benchmark Trafik</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              ≥ {(data?.summary.effectiveTrafficThreshold || minDailyTraffic).toLocaleString('id-ID')}{' '}
              <span className="text-sm font-normal text-slate-400">kunjungan</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>
                Target: <span className="font-semibold text-amber-300">{minDailyTraffic}/hari</span> ×{' '}
                <span className="font-semibold text-slate-200">{data?.summary.periodDays || 1} hari</span>
              </span>
              <span className="text-[10px] text-slate-500">(Med: {data?.summary.medianTraffic || 0})</span>
            </div>
          </div>
        </section>

        {/* 2. Interactive Matrix Visual & Mini Quadrant Status */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scatter Chart (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-rose-400" />
                  Dynamic BCG Matrix Visualization
                </h2>
                <p className="text-xs text-slate-400">
                  Garis Vertikal = Min. Trafik Star (≥ {(data?.summary.effectiveTrafficThreshold || minDailyTraffic).toLocaleString('id-ID')}) | Garis Horizontal = Benchmark CTOR (2.0%)
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Star
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Gem
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Bottleneck
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Dog
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Pengunjung"
                    unit=" klik"
                    stroke="#94A3B8"
                    fontSize={11}
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="CTOR"
                    unit="%"
                    stroke="#94A3B8"
                    fontSize={11}
                    domain={[0, 15]}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const pt = payload[0].payload;
                      const it = pt.item as DynamicMatrixItem;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs max-w-xs space-y-2">
                          <div className="font-bold text-white leading-tight">{it.product_name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: `${getColorByQuadrant(it.kuadran_code)}25`, color: getColorByQuadrant(it.kuadran_code) }}
                            >
                              {it.kuadran_name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                              {it.pareto_tier}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-slate-300 pt-1 border-t border-slate-800">
                            <div>Kunjungan: <b className="text-white">{it.visitors}</b></div>
                            <div>CTOR: <b className="text-white">{it.ctor}%</b></div>
                            <div>GMV Toko: <b className="text-white">{formatIDR(it.store_gmv)}</b></div>
                            <div>ROAS Iklan: <b className="text-emerald-400">{it.ads_roas}x</b></div>
                            <div>Stok: <b className="text-white">{it.stock} pcs</b></div>
                            <div>AOV: <b className="text-white">{formatIDR(it.aov)}</b></div>
                          </div>
                          <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                            <b>Aksi Ads:</b> {it.action_ads}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* Reference Lines */}
                  {data && (
                    <ReferenceLine
                      x={data.summary.effectiveTrafficThreshold || minDailyTraffic}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      label={{ value: `Min Star (${data.summary.effectiveTrafficThreshold || minDailyTraffic})`, fill: '#F59E0B', fontSize: 10, position: 'top' }}
                    />
                  )}
                  <ReferenceLine
                    y={2.0}
                    stroke="#06B6D4"
                    strokeDasharray="4 4"
                    label={{ value: 'Benchmark CR 2.0%', fill: '#06B6D4', fontSize: 10, position: 'right' }}
                  />
                  <Scatter name="Produk" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColorByQuadrant(entry.code)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quadrant Breakdown Cards (1 col) */}
          <div className="space-y-3 flex flex-col justify-between">
            {/* Kuadran 1 */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Kuadran 1: Stars
                </span>
                <span className="text-lg font-black text-white">{data?.summary.starsCount || 0}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Trafik Tinggi & Konversi Tinggi. <b>Aksi: Pertahankan stabilitas lelang & pasokan stok.</b>
              </p>
            </div>

            {/* Kuadran 2 */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <ArrowUpRight className="h-4 w-4" /> Kuadran 2: Hidden Gems
                </span>
                <span className="text-lg font-black text-white">{data?.summary.hiddenGemsCount || 0}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Konversi Tinggi tapi Trafik Rendah. <b>Aksi: Turunkan Target ROAS 15%-20% untuk scale up eksposur!</b>
              </p>
            </div>

            {/* Kuadran 3 */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Kuadran 3: Bottlenecks
                </span>
                <span className="text-lg font-black text-white">{data?.summary.bottlenecksCount || 0}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Trafik Melimpah tapi Gagal Beli. <b>Aksi: Wajib voucher keranjang (ATC) atau paket bundling!</b>
              </p>
            </div>

            {/* Kuadran 4 */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> Kuadran 4: Dogs / Long-Tail
                </span>
                <span className="text-lg font-black text-white">{data?.summary.dogsCount || 0}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Trafik & Konversi Rendah. <b>Aksi: Bidding ketat & program cuci gudang jika stok menumpuk.</b>
              </p>
            </div>
          </div>
        </section>

        {/* 3. Tabbed Actionable Table */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'all' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Semua Produk ({data?.items.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('hero')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'hero' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                👑 Hero Products (Top 80%)
              </button>
              <button
                onClick={() => setActiveTab('q1')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'q1' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                Stars ({data?.summary.starsCount || 0})
              </button>
              <button
                onClick={() => setActiveTab('q2')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'q2' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-400 hover:bg-slate-800'
                }`}
              >
                💎 Hidden Gems ({data?.summary.hiddenGemsCount || 0})
              </button>
              <button
                onClick={() => setActiveTab('q3')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'q3' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                ⚠️ Bottlenecks ({data?.summary.bottlenecksCount || 0})
              </button>
              <button
                onClick={() => setActiveTab('q4')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'q4' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Dogs ({data?.summary.dogsCount || 0})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama / ID produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Nama Produk & ID</th>
                  <th className="py-3 px-3">Kuadran</th>
                  <th className="py-3 px-3">Pareto Tier</th>
                  <th className="py-3 px-3 text-right">Kunjungan</th>
                  <th className="py-3 px-3 text-right">CTOR</th>
                  <th className="py-3 px-3 text-right">AOV</th>
                  <th className="py-3 px-3 text-right">GMV Toko</th>
                  <th className="py-3 px-3 text-right">ROAS Ads</th>
                  <th className="py-3 px-3 text-right">Stok Fisik</th>
                  <th className="py-3 px-4">Rekomendasi Aksi Ads Manager</th>
                  <th className="py-3 px-4">Rekomendasi Aksi Marketplace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-500" />
                      Memuat analitik matriks dari Supabase...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      Tidak ada produk yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-100 line-clamp-1" title={item.product_name}>
                          {item.product_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product_id}</div>
                      </td>

                      {/* Kuadran Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: `${getColorByQuadrant(item.kuadran_code)}20`,
                            color: getColorByQuadrant(item.kuadran_code),
                            border: `1px solid ${getColorByQuadrant(item.kuadran_code)}35`,
                          }}
                        >
                          Q{item.kuadran_code}
                        </span>
                      </td>

                      {/* Pareto Tier */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.pareto_tier === 'HERO (Top 80%)'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.pareto_tier === 'CORE (15%)'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.pareto_tier}
                        </span>
                      </td>

                      {/* Visitors */}
                      <td className="py-3 px-3 text-right font-medium text-slate-200">
                        <div>{item.visitors.toLocaleString('id-ID')}</div>
                        {(data?.summary.periodDays || 1) > 1 && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            {item.daily_visitors || Math.round(item.visitors / (data?.summary.periodDays || 1))}/hari
                          </div>
                        )}
                      </td>

                      {/* CTOR */}
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          item.ctor >= 2.0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {item.ctor}%
                      </td>

                      {/* AOV */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {formatIDR(item.aov)}
                      </td>

                      {/* Store GMV */}
                      <td className="py-3 px-3 text-right font-semibold text-white">
                        {formatIDR(item.store_gmv)}
                      </td>

                      {/* Ads ROAS */}
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          item.ads_roas >= 8.0
                            ? 'text-emerald-400'
                            : item.ads_roas > 0
                            ? 'text-cyan-400'
                            : 'text-slate-600'
                        }`}
                      >
                        {item.ads_roas > 0 ? `${item.ads_roas}x` : '-'}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            item.stock <= 20
                              ? 'text-rose-400'
                              : item.stock <= 100
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {item.stock.toLocaleString('id-ID')}
                        </span>
                      </td>

                      {/* Action Ads */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <span className="text-[11px] font-medium text-slate-300 bg-slate-800/80 px-2 py-1 rounded-md block border border-slate-700/60">
                          {item.action_ads}
                        </span>
                      </td>

                      {/* Action Marketplace */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <span className="text-[11px] font-medium text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded-md block border border-amber-500/20">
                          {item.action_marketplace}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        PT Shafco Multi Trading &bull; Zoya Performance Growth Platform &bull; Supabase + Next.js Dynamic Architecture
      </footer>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
