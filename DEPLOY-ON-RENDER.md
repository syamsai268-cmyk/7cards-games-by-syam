# Render deployment - existing service, version 1.1

**GitHub source:** https://github.com/syamsai268-cmyk/7cards-games-by-syam

**Render website:** https://sevencards-games-by-syam.onrender.com

**Render Dashboard:** https://dashboard.render.com/static/srv-dc254lnf3r2c73ebqns0

**Current settings created for the original site:**
- Static site, branch `main`
- Build command: `echo '7Cards Games static site ready'`
- Publish directory: `.`
- Auto Deploy: On Commit (`autoDeploy=yes`)

The `render.yaml` file is included as documentation/optional Blueprint configuration. It does not change the already-created site when you upload it. **No need to run Blueprint create.**

## Updating

1. Upload the extracted v1.1 website files to the existing GitHub repository, overwriting filenames in the repository root.
2. Commit to `main`. Render automatically starts a deploy from that commit.
3. View the Render Dashboard → Events / Deploys. Wait until status is **Live**.
4. Reload the live website in your browser. On the first update after v1.0, a second refresh may be necessary to activate the newer service worker.

GitHub Actions `/.github/workflows/ci.yml` runs syntax + rules checks automatically. With the currently configured **On Commit** deployment, a failing check will not prevent Render from deploying. To gate production deployments on passing CI, choose Render Dashboard → Service → Settings → Auto Deploy → **After CI Checks Pass** (if available for the service).
