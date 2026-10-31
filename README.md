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
- Environment variables: **none needed**

Click **Deploy** and wait for the deployment to become **Ready**. With the GitHub
integration connected, future pushes to `main` trigger production deployments automatically.

To check a production build locally, run `npm run build`, then `npm start`.

## Notes

The app is a prototype: login accepts any email, and class data is saved only in
the browser it was entered in. It uses no paid services: remarks and practice
sheets are made inside the app, so running costs are zero on Vercel's free plan.

## Where things are
- app/globals.css – all the styles
- lib/kaksha.ts – the app screens and logic (TypeScript)
- lib/sheets.ts – practice sheets (maths questions and reading passages by level)
- components/KakshaApp.tsx – starts the app on the page
- app/layout.tsx – page title and fonts
