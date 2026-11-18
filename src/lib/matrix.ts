import { supabase } from './supabase';
import { DynamicMatrixItem, DailyBenchmark } from './types';

export interface MatrixResult {
  summary: {
    totalStoreGmv: number;
    totalStoreOrders: number;
    totalAdsSpend: number;
    totalAdsGmv: number;
    overallRoas: number;
    medianTraffic: number;
    minDailyTraffic: number;
    periodDays: number;
    effectiveTrafficThreshold: number;
    activeProductsCount: number;
    heroProductsCount: number;
    starsCount: number;
    hiddenGemsCount: number;
    bottlenecksCount: number;
    dogsCount: number;
  };
  items: DynamicMatrixItem[];
}

// Helper to fetch all rows across PostgREST 1000-row pagination limit
async function fetchAllRows(tableName: string, filterDate?: { start: string; end: string }, selectCols: string = '*', orderBy?: { col: string; ascending: boolean }) {
  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    let query = supabase.from(tableName).select(selectCols);
    if (filterDate) {
      query = query.gte('date', filterDate.start).lte('date', filterDate.end);
    }
    if (orderBy) {
      query = query.order(orderBy.col, { ascending: orderBy.ascending });
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

export async function fetchMatrixData(startDate: string, endDate: string, minDailyTraffic: number = 50): Promise<MatrixResult> {
  // Calculate period duration in days for auto-scaling benchmark
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  const diffDays = Math.max(1, Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const effectiveTrafficThreshold = Math.max(1, minDailyTraffic * diffDays);

  // 1. Fetch products master (with pagination)
  const productsData = await fetchAllRows('products', undefined, 'product_id, product_name, category, seller_sku, price');
  const productsMap = new Map((productsData || []).map((p) => [p.product_id, p]));

  // 2. Fetch daily store metrics (with pagination)
  const storeData = await fetchAllRows('daily_store_metrics', { start: startDate, end: endDate });

  // 3. Fetch daily ads metrics (with pagination to prevent 1000-row cutoff on MTD)
  const adsData = await fetchAllRows('daily_ads_metrics', { start: startDate, end: endDate });

  // 4. Fetch live ads metrics (with pagination)
  const liveData = await fetchAllRows('daily_live_ads_metrics', { start: startDate, end: endDate });

  // 5. Fetch latest stock (with pagination)
  const stockData = await fetchAllRows('daily_stock_snapshots', undefined, 'product_id, total_stock, price', { col: 'date', ascending: false });
  const stockMap = new Map();
  (stockData || []).forEach((s) => {
    if (!stockMap.has(s.product_id)) {
      stockMap.set(s.product_id, s.total_stock);
    }
  });

  // Aggregate store metrics by product_id
  const storeAgg = new Map<string, { gmv: number; orders: number; visitors: number; atc: number; clicks: number }>();
  (storeData || []).forEach((row) => {
    const existing = storeAgg.get(row.product_id) || { gmv: 0, orders: 0, visitors: 0, atc: 0, clicks: 0 };
    existing.gmv += Number(row.store_gmv) || 0;
    existing.orders += Number(row.orders) || 0;
    existing.visitors += Number(row.visitors) || 0;
    existing.atc += Number(row.atc) || 0;
    existing.clicks += Number(row.clicks) || 0;
    storeAgg.set(row.product_id, existing);
  });

  // Aggregate ads metrics by product_id
  const adsAgg = new Map<string, { spend: number; gmv: number; orders: number }>();
  (adsData || []).forEach((row) => {
    const existing = adsAgg.get(row.product_id) || { spend: 0, gmv: 0, orders: 0 };
    existing.spend += Number(row.spend) || 0;
    existing.gmv += Number(row.ads_gmv) || 0;
    existing.orders += Number(row.ads_orders) || 0;
    adsAgg.set(row.product_id, existing);
  });

  // Collect all unique active product IDs
  const allProductIds = new Set<string>();
  storeAgg.forEach((_, id) => allProductIds.add(id));
  adsAgg.forEach((_, id) => allProductIds.add(id));

  // Build items array
  const rawItems: Array<{
    product_id: string;
    product_name: string;
    category: string;
    store_gmv: number;
    store_orders: number;
    visitors: number;
    atc: number;
    ctor: number;
    aov: number;
    ads_spend: number;
    ads_gmv: number;
    ads_orders: number;
    ads_roas: number;
    stock: number;
  }> = [];

  allProductIds.forEach((pId) => {
    const pMaster = productsMap.get(pId) || { product_name: 'Produk ID ' + pId, category: 'TikTok' };
    const st = storeAgg.get(pId) || { gmv: 0, orders: 0, visitors: 0, atc: 0, clicks: 0 };
    const ad = adsAgg.get(pId) || { spend: 0, gmv: 0, orders: 0 };
    const stock = stockMap.get(pId) || 0;

    const ctor = st.visitors > 0 ? Number(((st.orders / st.visitors) * 100).toFixed(2)) : 0;
    const aov = st.orders > 0 ? Math.round(st.gmv / st.orders) : 0;
    const roas = ad.spend > 0 ? Number((ad.gmv / ad.spend).toFixed(2)) : 0;

    rawItems.push({
      product_id: pId,
      product_name: pMaster.product_name,
      category: pMaster.category,
      store_gmv: st.gmv,
      store_orders: st.orders,
      visitors: st.visitors,
      atc: st.atc,
      ctor,
      aov,
      ads_spend: ad.spend,
      ads_gmv: ad.gmv,
      ads_orders: ad.orders,
      ads_roas: roas,
      stock,
    });
  });

  // Calculate Dynamic Median Traffic for active products
  const activeVisitors = rawItems.filter((i) => i.visitors > 0).map((i) => i.visitors).sort((a, b) => a - b);
  const medianTraffic = activeVisitors.length > 0 ? activeVisitors[Math.floor(activeVisitors.length / 2)] : 10;

  // Calculate Pareto Tier
  const totalStoreGmv = rawItems.reduce((acc, cur) => acc + cur.store_gmv, 0);
  rawItems.sort((a, b) => b.store_gmv - a.store_gmv);

  let runningGmv = 0;
  let starsCount = 0;
  let hiddenGemsCount = 0;
  let bottlenecksCount = 0;
  let dogsCount = 0;
  let heroCount = 0;

  const items: DynamicMatrixItem[] = rawItems.map((item) => {
    runningGmv += item.store_gmv;
    const cumRatio = totalStoreGmv > 0 ? runningGmv / totalStoreGmv : 1;

    let pareto_tier: DynamicMatrixItem['pareto_tier'] = 'LONG-TAIL (5%)';
    if (cumRatio <= 0.8) {
      pareto_tier = 'HERO (Top 80%)';
      heroCount++;
    } else if (cumRatio <= 0.95) {
      pareto_tier = 'CORE (15%)';
    }

    // Determine Kuadran based on auto-scaling threshold
    const isHighTraffic = item.visitors >= effectiveTrafficThreshold;
    const isHighConv = item.ctor >= 2.0;

    let kuadran_code: DynamicMatrixItem['kuadran_code'] = 4;
    let kuadran_name = 'Kuadran 4: Dog (Low Traffic, Low Conv)';

    if (isHighTraffic && isHighConv) {
      kuadran_code = 1;
      kuadran_name = 'Kuadran 1: Star (High Traffic, High Conv)';
      starsCount++;
    } else if (!isHighTraffic && isHighConv) {
      kuadran_code = 2;
      kuadran_name = 'Kuadran 2: Hidden Gem (Low Traffic, High Conv)';
      hiddenGemsCount++;
    } else if (isHighTraffic && !isHighConv) {
      kuadran_code = 3;
      kuadran_name = 'Kuadran 3: Bottleneck (High Traffic, Low Conv)';
      bottlenecksCount++;
    } else {
      dogsCount++;
    }

    // Determine Stock Status
    let stock_status: DynamicMatrixItem['stock_status'] = 'Aman (>100)';
    if (item.stock <= 20) stock_status = 'Kritis (<20)';
    else if (item.stock <= 100) stock_status = 'Terbatas (<100)';

    // Prescribe Actions
    let action_ads = 'Efisiensi / Monitor';
    let action_marketplace = 'Monitor Perputaran';

    if (kuadran_code === 1) {
      action_ads = 'Pertahankan / Scale Up Bidding';
      action_marketplace = 'Amankan Pasokan Stok Utama';
    } else if (kuadran_code === 2) {
      if (item.stock > 50) {
        action_ads = 'Turunkan Target ROAS 15%-20% (Buka Keran Trafik)';
        action_marketplace = 'Uji Promosi Live / Etalase';
      } else {
        action_ads = 'Tahan (Stok Terbatas, Jangan Di-scale)';
        action_marketplace = 'Restock Produk Segera';
      }
    } else if (kuadran_code === 3) {
      if (item.aov < 45000) {
        action_ads = 'Kunci Target ROAS >= 8.0x (Rem Pengaman AOV Rendah)';
        action_marketplace = 'Wajib Paket Bundling 2-3 Pcs (Naikkan AOV)';
      } else {
        action_ads = 'Kunci Target ROAS (Cek Rem Lelang)';
        action_marketplace = item.atc > 20 ? 'Kirim Voucher Pengingat Keranjang (ATC Recovery)' : 'Minta Diskon Tambahan / Voucher Toko';
      }
    } else {
      if (item.stock > 500) {
        action_ads = 'Biarkan Iklan Minimal';
        action_marketplace = 'Program Cuci Gudang (Clearance Sale)';
      }
    }

    const dailyVisitors = Math.round(item.visitors / diffDays);

    return {
      ...item,
      daily_visitors: dailyVisitors,
      pareto_tier,
      kuadran_code,
      kuadran_name,
      stock_status,
      action_ads,
      action_marketplace,
    };
  });

  // Calculate Ads live total
  const liveSpend = (liveData || []).reduce((acc, cur) => acc + (Number(cur.spend) || 0), 0);
  const liveGmv = (liveData || []).reduce((acc, cur) => acc + (Number(cur.ads_gmv) || 0), 0);

  const totalAdsSpend = rawItems.reduce((acc, cur) => acc + cur.ads_spend, 0) + liveSpend;
  const totalAdsGmv = rawItems.reduce((acc, cur) => acc + cur.ads_gmv, 0) + liveGmv;
  const overallRoas = totalAdsSpend > 0 ? Number((totalAdsGmv / totalAdsSpend).toFixed(2)) : 0;
  const totalStoreOrders = rawItems.reduce((acc, cur) => acc + cur.store_orders, 0);

  return {
    summary: {
      totalStoreGmv,
      totalStoreOrders,
      totalAdsSpend,
      totalAdsGmv,
      overallRoas,
      medianTraffic,
      minDailyTraffic,
      periodDays: diffDays,
      effectiveTrafficThreshold,
      activeProductsCount: rawItems.length,
      heroProductsCount: heroCount,
      starsCount,
      hiddenGemsCount,
      bottlenecksCount,
      dogsCount,
    },
    items,
  };
}
