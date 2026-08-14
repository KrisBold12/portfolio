# web

The React frontend for the portfolio: the home page, the dog breed classifier project page, and the live demo that calls the serving API.

- `npm run dev` starts the Vite dev server. `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`, so the FastAPI service in `serving/` must be running locally for the demo to work.
- `npm run build` type-checks with `tsc -b` and produces the static bundle nginx serves in production.
- `npm run test` runs the vitest suite for the pure logic modules (calibration, breed merging, downscaling, the ReadoutRail geometry helpers).

In production, nginx serves the built files and forwards `/api` to the same container on loopback (see `deploy/nginx/kb-portfolio.conf`), so the site and the API share one origin in both places, just by different means.
