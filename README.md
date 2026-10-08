# App List

A static site listing recommended apps, available in English (en-us) and Traditional Chinese (zh-tw), with card/list view modes. Built with Vite + React + TypeScript, deployed to GitHub Pages.

## Adding an app

Add a new JSON file to [src/data/apps/](src/data/apps/), named after the app (e.g. `my-app.json`):

```json
{
  "id": "my-app",
  "name": "My App",
  "url": "https://example.com",
  "icon": "🚀",
  "tags": ["tag1", "tag2"],
  "category": {
    "en-us": "Category in English",
    "zh-tw": "分類的繁體中文"
  },
  "description": {
    "en-us": "Short description in English.",
    "zh-tw": "簡短的繁體中文說明。"
  }
}
```

Every `.json` file in that folder is picked up automatically — no other code changes needed. Commit and push to `main` and the site rebuilds and redeploys automatically.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds the site and publishes it to GitHub Pages.

One-time setup after creating the GitHub repo: go to **Settings → Pages** and set **Source** to **GitHub Actions**.

The site will be available at `https://<your-username>.github.io/app-list/`.
