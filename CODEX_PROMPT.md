You are Codex working in a brand-new, empty project directory for a new standalone website. Your task is to create and prepare the **Fearless Free Ebook Website** exactly from the files in this uploaded package.

Critical safety rules:

1. Do **not** modify, rename, delete, deploy, import, or connect to any existing GitHub or Vercel project.
2. The following projects are completely out of scope and must not be touched in any way: `lifeguard scheduler`, `lakesideessentials.com`, and the `RollinDD platform`.
3. Create or use only a new standalone repository/project, ideally named `fearless-free-ebook` or `fearless-book1-free-download`.
4. Do not use existing environment variables, secrets, Vercel project links, monorepos, deployment aliases, or Git remotes.
5. Work only inside the current project root containing this package.
6. This is a static site. Do not add a framework unless I explicitly ask. Do not add unnecessary dependencies.
7. Preserve the free-download purpose: the website must let readers download the ebook for free in PDF and EPUB, plus the included artwork collection.
8. Preserve the author name as **RollinD**.
9. Preserve the visual direction: epic, cinematic, mystical, blue/purple/gold, ancient-future, simple navigation, premium author-site feel.

Build objective:

- Create a clean static website using the included `index.html`, `styles.css`, `script.js`, `assets/`, and `downloads/` files.
- Confirm the download links work:
  - `/downloads/Fearless_Book1_RollinD_Free_Ebook.pdf`
  - `/downloads/Fearless_Book1_RollinD_Free_Ebook.epub`
  - `/downloads/Fearless_Book1_RollinD_FullRes_Images.zip`
- Confirm the site has these sections: hero/free download, about the book, vision/philosophy, sample excerpt, 50-image artwork gallery, series roadmap, author section, FAQ, and final download CTA.
- Confirm `vercel.json` is safe and contains only static asset/download headers.
- Do not add analytics, tracking, server actions, forms that store data, authentication, databases, APIs, Stripe, or any paid-download behavior.

Recommended verification steps:

1. List the project files and confirm there is no `.git` folder pointing to an existing repository.
2. Serve the site locally with a simple static server, for example:
   - `python3 -m http.server 3000`
3. Open `http://localhost:3000` and verify visual layout, responsiveness, and download links.
4. Verify individual file sizes are below GitHub’s 100 MB single-file limit.
5. If deploying, create a **new** GitHub repo and a **new** Vercel project only.
6. After deployment, update `sitemap.xml` from `https://example.com/` to the final domain.

Deliverable expected from Codex:

- A ready-to-commit static website in a new standalone project folder.
- A short deployment checklist.
- No changes to any other repository or Vercel project.
