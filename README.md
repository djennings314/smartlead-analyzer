# Smartlead Bottleneck Analyzer

A Next.js app deployed on Vercel that analyzes Smartlead campaign message histories to surface reply bottlenecks, sequence drop-off, and subject line performance.

## How it works

- All Smartlead API calls are made **server-side** via Next.js API routes — no CORS issues, no key exposure
- Paginates through all leads automatically (handles campaigns with thousands of leads)
- Batches message history fetches 8 at a time for speed
- Computes stats server-side, then runs AI analysis via Claude

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "init"
gh repo create smartlead-analyzer --private --push
```

### 2. Import to Vercel

Go to [vercel.com/new](https://vercel.com/new) → Import your repo → Framework: **Next.js**

### 3. Set environment variables in Vercel

```
SMARTLEAD_API_KEY=your_smartlead_api_key
```

### 4. Deploy

Vercel auto-deploys on push. Done.

## Local dev

```bash
cp .env.example .env.local
# add your key to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Select a campaign from the dropdown
2. Set sample size (default 200 — increase for more accuracy, decrease for speed)
3. Click **Analyze**
4. Results show:
   - Reply rate + avg touches before reply
   - Sequence step drop-off table
   - AI-identified bottlenecks with severity + recommendations
   - Subject line performance ranked by reply rate
