# Render update — v1.3.0

This project is ALREADY deployed as an existing Render static site, so do not create another Render service.

- Website: https://sevencards-games-by-syam.onrender.com
- Dashboard: https://dashboard.render.com/static/srv-dc254lnf3r2c73ebqns0
- Repo: https://github.com/syamsai268-cmyk/7cards-games-by-syam
- Branch: `main` — Render Auto Deploy: On Commit

To update, run `Update-GitHub-v1.3.ps1` or upload all extracted files into the existing GitHub repo root and commit to main. Render will deploy the commit automatically.

After Render shows Live, hard-refresh the game (Ctrl + Shift + R) if the old UI remains.

No Render API token is necessary for the existing automatic deploy. GitHub Actions checks JavaScript and game rules; Render's On Commit mode is not gated on those checks.
