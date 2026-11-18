# Zoya TikTok GMV Max Matrix Dashboard

Dynamic BCG Matrix & Actionable E-commerce Analytics Web Dashboard for TikTok Shop & GMV Max Ads Zoya (PT Shafco Multi Trading).

## Architecture
- **Frontend / Fullstack:** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts)
- **Database / Backend:** Supabase Cloud (PostgreSQL, Row-Level Security, PostgREST API)
- **Data Ingestion Engine:** Python (Pandas, OpenPyXL, Supabase Client)

## Features
- **Dynamic BCG Matrix:** Replaces static arbitrary benchmarks with dynamic daily median traffic and 2.0% Click-to-Order Rate (CTOR).
- **Pareto 80/20 Tiering:** Automatically identifies and protects Top 80% Hero Products (Marsha HL, Kamaniya, etc.).
- **Inventory Feasibility Check:** Real-time stock status integration (Critical <=20 pcs, Safe, Clearance).
- **Dual Action Prescriptive Engine:** Clear separation of Ads Manager Actions vs Marketplace / Inventory Actions.
- **Interactive Scatter Plot:** Visual quadrant mapping with rich tooltips.

## Getting Started

1. Clone repository:
   ```bash
   git clone https://github.com/irfanmln/zoya-tiktok-matrix-dashboard.git
   cd zoya-tiktok-matrix-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run locally:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)
Import this repository in [Vercel](https://vercel.com) and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Environment Variables.
