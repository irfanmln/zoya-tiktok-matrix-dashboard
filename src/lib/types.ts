export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  seller_sku: string;
  price: number;
}

export interface StoreMetric {
  id?: string;
  date: string;
  product_id: string;
  visitors: number;
  clicks: number;
  impressions: number;
  atc: number;
  orders: number;
  sku_orders: number;
  qty_sold: number;
  store_gmv: number;
  aov: number;
  ctor: number;
  live_gmv: number;
  video_gmv: number;
  affiliate_gmv: number;
  card_gmv: number;
}

export interface AdsMetric {
  id?: string;
  date: string;
  product_id: string;
  campaign_name: string;
  campaign_id: string;
  spend: number;
  spend_affiliate: number;
  ads_gmv: number;
  ads_orders: number;
  roas: number;
}

export interface LiveAdsMetric {
  id?: string;
  date: string;
  campaign_name: string;
  campaign_id: string;
  spend: number;
  ads_gmv: number;
  ads_orders: number;
  roas: number;
  live_views: number;
}

export interface StockSnapshot {
  id?: string;
  date: string;
  product_id: string;
  total_stock: number;
  price: number;
  variants_count: number;
}

export interface DailyBenchmark {
  date: string;
  total_store_gmv: number;
  total_ads_spend: number;
  total_ads_gmv: number;
  overall_roas: number;
  median_traffic: number;
  active_products_count: number;
}

export interface DynamicMatrixItem {
  product_id: string;
  product_name: string;
  category: string;
  store_gmv: number;
  store_orders: number;
  visitors: number;
  daily_visitors?: number;
  atc: number;
  ctor: number; // percentage, e.g. 2.82
  aov: number;
  ads_spend: number;
  ads_gmv: number;
  ads_orders: number;
  ads_roas: number;
  stock: number;
  pareto_tier: 'HERO (Top 80%)' | 'CORE (15%)' | 'LONG-TAIL (5%)';
  kuadran_code: 1 | 2 | 3 | 4;
  kuadran_name: string;
  stock_status: 'Kritis (<20)' | 'Terbatas (<100)' | 'Aman (>100)';
  action_ads: string;
  action_marketplace: string;
}
