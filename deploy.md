# Deploy to GitHub Pages (donkeybas.com)

The site is static files at the repo root. [`CNAME`](CNAME) points at `donkeybas.com`.

Deploy uses **GitHub Actions** (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)), not “Deploy from a branch”. That workflow stamps `version.json` with `GITHUB_SHA` so the footer can show which commit is live. (Branch-based Pages has no build-time env vars.)

1. **GitHub → Settings → Pages**
   - Source: **GitHub Actions**
   - Custom domain: `donkeybas.com`
   - Enable **Enforce HTTPS** after DNS works

2. **DNS at your registrar** (apex + www):

   | Type  | Name | Value |
   | ----- | ---- | ----- |
   | A     | `@`  | `185.199.108.153` |
   | A     | `@`  | `185.199.109.153` |
   | A     | `@`  | `185.199.110.153` |
   | A     | `@`  | `185.199.111.153` |
   | CNAME | `www`| `jkrauska.github.io` |

3. Wait for DNS / TLS (often under an hour; sometimes longer). Confirm with:

   ```bash
   dig +short donkeybas.com A
   curl -sI https://donkeybas.com | head -5
   ```

If GitHub Pages SSL for the apex domain is awkward, the same files deploy unchanged to Cloudflare Pages with the domain attached there.
