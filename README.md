# Fearless Free Ebook Website

A self-contained static website for **Fearless: The Altar of Light and Darkness** by **RollinD**. The site provides free downloads of the ebook in PDF and EPUB, a full-resolution artwork collection, and a cinematic companion album/player section. It is designed to be deployed as a new, standalone Vercel/GitHub project.

## What is included

- `index.html` - the complete one-page author/book website.
- `styles.css` - cinematic blue/purple/gold visual system.
- `script.js` - small progressive enhancement for scroll reveal and sharing.
- `assets/images/` - optimized web artwork and gallery thumbnails.
- `assets/music/playlist.json` - public Suno playlist metadata and media URLs for the album section.
- `downloads/Fearless_Book1_RollinD_Free_Ebook.pdf` - web-optimized PDF download.
- `downloads/Fearless_Book1_RollinD_Free_Ebook.epub` - fixed-layout EPUB download.
- `downloads/Fearless_Book1_RollinD_FullRes_Images.zip` - full-resolution artwork collection.
- `vercel.json` - safe static-site headers only.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `favicon.png`.
- `docs/download-checksums.sha256` - SHA-256 checksums for the download files.
- `CODEX_PROMPT.md` - a ready-to-paste Codex prompt for creating the new project safely.

## Deployment: safest path

1. Create a **new empty GitHub repository**. Suggested name: `fearless-free-ebook`.
2. Upload only the contents of this folder to that new repository.
3. In Vercel, create a **new project** from that new repository.
4. Do not connect this repository to any existing Vercel project.
5. Leave build settings blank/default. This is a static site and does not require `npm install`.
6. After deployment, replace `https://example.com/` in `sitemap.xml` with the final domain.

## Safety boundaries

This package is standalone. It does not include code, settings, environment variables, API keys, or references for any other project. Do **not** place these files inside existing projects such as lifeguard scheduler, lakesideessentials.com, or the RollinDD platform. Keep this in its own repository and Vercel project.

## Album media note

The album section streams public media URLs from the RollinD Suno playlist instead of committing the scraped MP3/video files into the website. This keeps the deployable static site smaller and safer for Vercel. If you later want a downloadable album ZIP, host that ZIP separately, then add its URL to the album section.

## Updating downloads

If you later update the ebook or artwork files:

1. Replace the files in `downloads/` using the same filenames, or update the links in `index.html`.
2. Recalculate checksums with:

```bash
sha256sum downloads/* > docs/download-checksums.sha256
```

## Notes

- The PDF is web-optimized to keep the file below common GitHub single-file limits.
- The EPUB is fixed-layout to preserve the illustrated design.
- The artwork showcase uses smaller local thumbnails for speed and links to full-resolution images.
- The album section uses a static JSON file and public Suno media URLs; it does not add a backend or store listener data.
- The release panel is intentionally static: no forms, checkout, accounts, databases, or tracking.
