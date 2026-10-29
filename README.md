# Kaksha (Next.js + TypeScript)

## Run on your computer
1. Install Node.js 24 LTS (https://nodejs.org)
2. Open Terminal in this folder and run:
   npm ci
   npm run dev
3. Open http://localhost:3000

## Deploy on Vercel

Repository: https://github.com/GET-SOURABH/Kaksha

In https://vercel.com/new, connect GitHub and import `GET-SOURABH/Kaksha`.
If prompted, authorize Vercel to access this repository. Use these settings:

- Framework preset: **Next.js** (automatically detected)
- Root directory: **./** (the repository root)
- Production branch: **main**
- Node.js version: **24.x**
- Install command: **npm ci**
- Build command: **npm run build**
- Output directory: leave the **Next.js default**
- Environment variables: **none currently required**

Click **Deploy** and wait for the deployment to become **Ready**. Open the
production URL to verify the site. With the GitHub integration connected, future
pushes to `main` trigger production deployments automatically.

To check a production build locally, run `npm run build`, then `npm start`.
Keep secrets in local `.env` files or Vercel's Environment Variables settings;
local environment files are excluded from Git.

The existing app is a prototype: login accepts any email and class data resets
when the page reloads. Deployment preserves this behavior.

## Where things are
- app/globals.css – all the styles
- lib/kaksha.ts – all the app logic (TypeScript)
- components/KakshaApp.tsx – starts the app on the page
- app/layout.tsx – page title and fonts
