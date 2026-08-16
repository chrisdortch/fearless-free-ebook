# Clover Build Protocol v1

This repository is the second portability pilot for the Clover Build Protocol. It applies the same policy, read-only CI, receipt, preview, and owner-release boundaries used by RollinDD to a standalone static website.

## Required files

- `.clover/project.json` — exact project identity, risk classification, allowed branch prefixes, commands, sensitive paths, and owner-only actions.
- `scripts/clover-build.mjs` — policy-bound runner that performs preflight checks, executes the configured validation commands, and writes a machine-readable receipt.
- `.github/workflows/preview-safety.yml` — read-only CI wrapper that checks out the exact candidate commit and uploads the receipt and browser evidence.

## Static-site validation

This project adds project-specific checks without changing the public website:

- JavaScript syntax validation;
- required-file and local-reference integrity;
- playlist structure validation;
- SHA-256 verification of the ebook, artwork, and album downloads;
- desktop Chromium interaction testing; and
- mobile WebKit interaction testing with an iPhone profile.

## Operating sequence

1. Confirm the repository, production branch, Vercel project, and production domain.
2. Create a non-production branch using an allowed prefix.
3. Make only the approved changes.
4. Push the branch. GitHub Actions validates the exact commit with read-only repository permission.
5. Vercel creates a preview deployment from the same commit.
6. Compare the receipt, GitHub commit, and Vercel deployment SHA.
7. Open or update a draft pull request for owner review.
8. Stop. Merge, production promotion, domains, secrets, download replacement, and paid services require separate owner approval.

The CI receipt never authorizes release and does not claim to observe external production promotion. That state must be checked independently through Vercel and the deployed domain.
