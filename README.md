# NeetCode 150 POTD

Free static webpage that shows one NeetCode 150 Problem of the Day.

## Host on GitHub Pages (free)

1. Create a GitHub repository and push this folder to the `main` branch.
2. In GitHub, open `Settings -> Pages`.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push any change to `main` (or run the workflow manually from the Actions tab).
5. Your site will be live at:
   - `https://<your-username>.github.io/<repo-name>/`

This repo includes `.github/workflows/deploy-pages.yml`, which deploys the static files automatically.

## How it works

- Uses `data/neetcode150.json` (150 problems from NeetCode 150 source data).
- Picks a deterministic daily index using local date at midnight.
- Changes automatically every day at 12:00 AM local time.

## Run locally

Because the page uses `fetch()` for JSON, run it with a local server:

```bash
cd Desktop/neetcode-potd
python -m http.server 8000
```

Then open: `http://localhost:8000`
