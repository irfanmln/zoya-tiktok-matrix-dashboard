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
    activeProductsCount: number;
    heroProductsCount: number;
    starsCount: number;
    hiddenGemsCount: number;
    bottlenecksCount: number;
    dogsCount: number;
  };
  items: DynamicMatrixItem[];
}

export async function fetchMatrixData(startDate: string, endDate: string): Promise<MatrixResult> {
  // 1. Fetch products master
  const { data: productsData, error: prodErr } = await supabase
    .from('products')
    .select('product_id, product_name, category, seller_sku, price');

  if (prodErr) throw prodErr;
  const productsMap = new Map((productsData || []).map((p) => [p.product_id, p]));

  // 2. Fetch daily store metrics
  const { data: storeData, error: storeErr } = await supabase
    .from('daily_store_metrics')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (storeErr) throw storeErr;

  // 3. Fetch daily ads metrics
  const { data: adsData, error: adsErr } = await supabase
    .from('daily_ads_metrics')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (adsErr) throw adsErr;

  // 4. Fetch live ads metrics
  const { data: liveData } = await supabase
    .from('daily_live_ads_metrics')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  // 5. Fetch latest stock
  const { data: stockData, error: stockErr } = await supabase
    .from('daily_stock_snapshots')
    .select('product_id, total_stock, price')
    .order('date', { ascending: false });

  if (stockErr) throw stockErr;
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

    // Determine Kuadran
    const isHighTraffic = item.visitors >= medianTraffic;
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

    return {
      ...item,
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
