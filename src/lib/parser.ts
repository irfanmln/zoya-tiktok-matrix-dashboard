import * as XLSX from 'xlsx';
import { supabase } from './supabase';

export interface ParseResult {
  date: string;
  products: any[];
  storeMetrics: any[];
  adsMetrics: any[];
  liveMetrics: any[];
  stockSnapshots: any[];
  benchmark: any;
}

export function cleanCurrency(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return 0;
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseFloat(digits) : 0;
}

export function cleanInt(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.floor(val);
  const s = String(val).trim();
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function cleanRate(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val > 1.0 ? val / 100.0 : val;
  let s = String(val).trim().replace('%', '');
  const f = parseFloat(s);
  if (isNaN(f)) return 0;
  return f > 1.0 ? f / 100.0 : f;
}

export type FileType = 'stock' | 'store' | 'ads_product' | 'ads_live';

export function detectFileType(fileName: string, sheetNames: string[], firstRow: any[]): FileType | null {
  const nameLower = fileName.toLowerCase();
  
  if (nameLower.includes('live') || sheetNames.includes('Data')) {
    return 'ads_live';
  }
  if (sheetNames.includes('Template') || nameLower.includes('batchedit') || nameLower.includes('sales_information')) {
    return 'stock';
  }
  if (nameLower.includes('product_list') || (firstRow && firstRow.some((c) => String(c).includes('Product name') || String(c).includes('Nama produk')))) {
    // If it has Campaign name, it's ads_product
    if (nameLower.includes('campaign') || nameLower.includes('product data') || (firstRow && firstRow.some((c) => String(c).includes('Campaign name')))) {
      return 'ads_product';
    }
    return 'store';
  }
  if (nameLower.includes('product data') || nameLower.includes('all campaigns-product')) {
    return 'ads_product';
  }
  return null;
}

export async function parseAndIngestFiles(
  dateStr: string,
  files: {
    stockFile?: File | null;
    storeFile?: File | null;
    adsProductFile?: File | null;
    adsLiveFile?: File | null;
  },
  onProgress?: (status: string) => void
): Promise<{ success: boolean; message: string }> {
  try {
    const productsMap = new Map<string, any>();
    const stockMap = new Map<string, any>();
    const storeMetrics: any[] = [];
    const adsMetrics: any[] = [];
    const liveMetrics: any[] = [];

    // 1. Process Real-time Stock File
    if (files.stockFile) {
      onProgress?.('Membaca file Stok Realtime...');
      const buffer = await files.stockFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames.includes('Template') ? 'Template' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      for (let i = 5; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const pId = String(row[0]).trim();
        if (!pId || !/^\d+$/.test(pId)) continue;

        const cat = row[1] ? String(row[1]).trim() : '';
        const name = row[2] ? String(row[2]).trim() : '';
        const price = cleanCurrency(row[5]);
        const qty = cleanInt(row[6]);
        const sku = row[7] ? String(row[7]).trim() : '';

        if (!productsMap.has(pId)) {
          productsMap.set(pId, {
            product_id: pId,
            product_name: name,
            category: cat,
            seller_sku: sku,
            price: price,
          });
          stockMap.set(pId, {
            date: dateStr,
            product_id: pId,
            total_stock: qty,
            price: price,
            variants_count: 1,
          });
        } else {
          const s = stockMap.get(pId);
          if (s) {
            s.total_stock += qty;
            s.variants_count += 1;
          }
          const p = productsMap.get(pId);
          if (p && !p.product_name && name) {
            p.product_name = name;
          }
        }
      }
    }

    // 2. Process Store Product Performance
    if (files.storeFile) {
      onProgress?.('Membaca file Performa Produk Toko...');
      const buffer = await files.storeFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      for (let i = 4; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[1]) continue;
        const pName = row[0] ? String(row[0]).trim() : '';
        const pId = String(row[1]).trim();
        if (!pId || !/^\d+$/.test(pId)) continue;

        const gmv = cleanCurrency(row[3]);
        const orders = cleanInt(row[18]);
        const skuOrders = cleanInt(row[19]);
        const qtySold = cleanInt(row[20]);
        const aov = cleanCurrency(row[22]);
        const impressions = cleanInt(row[23]);
        const clicks = cleanInt(row[24]);
        const atc = cleanInt(row[26]);
        const ctor = cleanRate(row[28]);
        const visitors = cleanInt(row[30]);
        const liveGmv = cleanCurrency(row[51]);
        const videoGmv = cleanCurrency(row[75]);
        const affiliateGmv = cleanCurrency(row[100]);
        const cardGmv = cleanCurrency(row[151]);

        if (!productsMap.has(pId)) {
          productsMap.set(pId, {
            product_id: pId,
            product_name: pName,
            category: 'TikTok Shop',
            seller_sku: '',
            price: aov,
          });
        }

        storeMetrics.push({
          date: dateStr,
          product_id: pId,
          visitors,
          clicks,
          impressions,
          atc,
          orders,
          sku_orders: skuOrders,
          qty_sold: qtySold,
          store_gmv: gmv,
          aov,
          ctor: Number(ctor.toFixed(4)),
          live_gmv: liveGmv,
          video_gmv: videoGmv,
          affiliate_gmv: affiliateGmv,
          card_gmv: cardGmv,
        });
      }
    }

    // 3. Process Products Ads GMV Max
    if (files.adsProductFile) {
      onProgress?.('Membaca file Iklan Produk GMV Max...');
      const buffer = await files.adsProductFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[3]) continue;
        const pName = row[0] ? String(row[0]).trim() : '';
        const cId = row[1] ? String(row[1]).trim() : '';
        const cName = row[2] ? String(row[2]).trim() : '';
        const pId = String(row[3]).trim();
        if (!pId || !/^\d+$/.test(pId)) continue;

        const cost = cleanCurrency(row[4]);
        const costAff = cleanCurrency(row[5]);
        const skuOrders = cleanInt(row[6]);
        const gmv = cleanCurrency(row[8]);
        const roas = row[9] !== undefined && row[9] !== null ? parseFloat(String(row[9])) : 0;

        if (!productsMap.has(pId)) {
          productsMap.set(pId, {
            product_id: pId,
            product_name: pName,
            category: 'TikTok Ads',
            seller_sku: '',
            price: 0,
          });
        }

        adsMetrics.push({
          date: dateStr,
          product_id: pId,
          campaign_name: cName,
          campaign_id: cId,
          spend: cost,
          spend_affiliate: costAff,
          ads_gmv: gmv,
          ads_orders: skuOrders,
          roas: Number(roas.toFixed(2)),
        });
      }
    }

    // 4. Process Live Ads GMV Max
    if (files.adsLiveFile) {
      onProgress?.('Membaca file Iklan Live GMV Max...');
      const buffer = await files.adsLiveFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames.includes('Data') ? 'Data' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[1]) continue;
        const cId = row[0] ? String(row[0]).trim() : '';
        const cName = String(row[1]).trim();
        if (!cName) continue;

        const cost = cleanCurrency(row[3]);
        const gmv = cleanCurrency(row[8]);
        const roas = row[9] !== undefined && row[9] !== null ? parseFloat(String(row[9])) : 0;
        const orders = cleanInt(row[10]);
        const views = cleanInt(row[12]);

        liveMetrics.push({
          date: dateStr,
          campaign_name: cName,
          campaign_id: cId,
          spend: cost,
          ads_gmv: gmv,
          ads_orders: orders,
          roas: Number(roas.toFixed(2)),
          live_views: views,
        });
      }
    }

    // 5. Calculate Benchmark Record
    const totStoreGmv = storeMetrics.reduce((sum, m) => sum + m.store_gmv, 0);
    const totAdsSpend = adsMetrics.reduce((sum, m) => sum + m.spend, 0) + liveMetrics.reduce((sum, m) => sum + m.spend, 0);
    const totAdsGmv = adsMetrics.reduce((sum, m) => sum + m.ads_gmv, 0) + liveMetrics.reduce((sum, m) => sum + m.ads_gmv, 0);
    const overallRoas = totAdsSpend > 0 ? Number((totAdsGmv / totAdsSpend).toFixed(2)) : 0;

    const visList = storeMetrics.map((m) => m.visitors).filter((v) => v > 0);
    visList.sort((a, b) => a - b);
    const medVis = visList.length > 0 ? visList[Math.floor(visList.length / 2)] : 10;

    const benchmarkRecord = {
      date: dateStr,
      total_store_gmv: totStoreGmv,
      total_ads_spend: totAdsSpend,
      total_ads_gmv: totAdsGmv,
      overall_roas: overallRoas,
      median_traffic: medVis,
      active_products_count: storeMetrics.length,
    };

    // 6. Ingest in chunks to Supabase
    onProgress?.('Mengunggah data master produk ke Supabase...');
    const productsArr = Array.from(productsMap.values());
    if (productsArr.length > 0) {
      await chunkUpsert('products', productsArr, 'product_id');
    }

    if (stockMap.size > 0) {
      onProgress?.('Mengunggah snapshot stok fisik...');
      await chunkUpsert('daily_stock_snapshots', Array.from(stockMap.values()), 'date,product_id');
    }

    if (storeMetrics.length > 0) {
      onProgress?.('Mengunggah metrik performa produk toko...');
      await chunkUpsert('daily_store_metrics', storeMetrics, 'date,product_id');
    }

    if (adsMetrics.length > 0) {
      onProgress?.('Mengunggah metrik iklan GMV Max produk...');
      await chunkUpsert('daily_ads_metrics', adsMetrics, 'date,product_id,campaign_name');
    }

    if (liveMetrics.length > 0) {
      onProgress?.('Mengunggah metrik iklan Live GMV Max...');
      await chunkUpsert('daily_live_ads_metrics', liveMetrics, 'date,campaign_name');
    }

    if (storeMetrics.length > 0 || adsMetrics.length > 0) {
      onProgress?.('Menyimpan benchmark & ringkasan toko...');
      await chunkUpsert('daily_benchmarks', [benchmarkRecord], 'date');
    }

    onProgress?.('Selesai! Data berhasil disinkronkan.');
    return {
      success: true,
      message: `Berhasil mengunggah data tanggal ${dateStr}! (${productsArr.length} SKU, ${storeMetrics.length} data toko, ${adsMetrics.length} data ads produk, ${liveMetrics.length} ads live)`,
    };
  } catch (err: any) {
    console.error('Error during ingestion:', err);
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan saat memproses file.',
    };
  }
}

async function chunkUpsert(table: string, records: any[], onConflictCols: string) {
  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: onConflictCols });
    if (error) {
      console.error(`Error upserting chunk to ${table}:`, error);
      throw error;
    }
  }
}
