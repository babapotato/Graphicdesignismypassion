# Sanity (Headless CMS) setup notes

This folder contains the **schema** you’ll add to your Sanity Studio (Sanity v3).
Your portfolio site remains a **static GitHub Pages** site and fetches content via Sanity’s **CDN API**.

## 1) Create a Sanity project + dataset

In Sanity Manage:
- Find your **Project ID**
- Confirm your **Dataset** name (commonly `production`)

## 2) Add the schema to your Sanity Studio

If you already have a Studio repo:
- Copy `sanity/schemaTypes/project.js` and `sanity/schemaTypes/index.js` into your Studio’s `schemaTypes/` folder.
- Ensure your Studio’s `sanity.config.ts|js` uses `schemaTypes`.

The `Project` type includes:
- Title
- Description
- Main image
- Technologies (list)
- URL

## 3) Make your dataset readable from the web

For a static site using the CDN API, make sure your project has a public read path:
- Set an appropriate CORS origin for your GitHub Pages domain
- Ensure your dataset can be queried without a token (or use a token ONLY for private datasets; not recommended for GitHub Pages)

## 4) Wire your site to Sanity

Edit:
- `js/sanity.js`

Replace:
- `projectId: 'YOUR_PROJECT_ID'`
- `dataset: 'YOUR_DATASET'`

That’s it — `js/main.js` will prefer Sanity projects and fall back to `content/site_data.json` if Sanity isn’t configured.

