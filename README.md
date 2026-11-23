# 7Cards Games — By Syam (v1.1.0)

Play Sevens with friends (private invite links) or bots, using 52 cards and 5–100 rounds. The **7♥ starts**, suits build down to Ace and up to King, and the lowest cumulative penalty wins.

**Live website:** https://sevencards-games-by-syam.onrender.com

## What's new in v1.1

- All four suit symbols are bright, labeled and distinguishable at the table.
- Cards in your hand remain legible even when it isn't your turn.
- Table slots identify which cards have been played, with clear rank and mini suit symbol.
- Friends-only **live voice chat**: click **Join voice**, approve microphone access, click **Mute mic** or **Leave voice** at any time. Voice only works for people currently connected to the same room. Bots cannot talk.
- Optional **Speak card moves and turns** browser text-to-speech announcer.
- Service worker cache updated; CSS and JS have version query parameters to encourage fresh loads.
- GitHub Actions CI checks syntax, file integrity and the Sevens game rules.

## Deploying v1.1 to your existing Render site

**Do not create a new Render service.** The existing static site already tracks `main` with auto-deploy on every commit.

### Easy: GitHub website

1. Extract `7cards-games-by-syam-v1.1.zip` on your computer.
2. Visit https://github.com/syamsai268-cmyk/7cards-games-by-syam
3. Choose **Add file → Upload files**.
4. Drag the **contents** of the extracted folder into GitHub. Include all root files AND the `.github/workflows/ci.yml` and `scripts/check-release.mjs` paths. Existing filenames must be overwritten/committed. Do not upload the ZIP itself.
5. Choose **Commit directly to main**, message `Release v1.1 - color and voice chat`, then **Commit changes**.
6. Check GitHub **Actions** for the `7Cards CI - validate v1.1` job and [Render deploys](https://dashboard.render.com/static/srv-dc254lnf3r2c73ebqns0). Render's **On Commit** mode deploys independently of the CI check result; switch Render Auto Deploy to **After CI Checks Pass** for gated deployment.
7. Open https://sevencards-games-by-syam.onrender.com and refresh (Ctrl+Shift+R if old assets are cached).

### PowerShell: one command

If Git for Windows is installed, open PowerShell in this extracted directory, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\Update-GitHub-v1.1.ps1
```

The script clones your existing repository in a uniquely named temporary folder, replaces the selected game files, commits, and pushes to `main`. Git credentials are handled by Git Credential Manager; the script does not request/store a token.

## Tests

Requires Node.js 22+:

```bash
node --check app.js
node --check sw.js
node scripts/check-release.mjs
```

## Technical notes and limitations

- The site is static. Multiplayer uses PeerJS for signaling and WebRTC peer-to-peer data connections. The room host must keep the browser open; if the host leaves, the game ends for the others.
- Voice chat also uses PeerJS WebRTC media calls. Everyone must explicitly opt in and allow microphone access. HTTPS is required on the hosted site. Depending on mobile carrier, browser, firewall, or NAT, some audio links may fail without a TURN relay server; **voice calls have not been verified across real external devices yet**.
- No server-side recordings or audio uploads are implemented. Audio travels peer to peer when WebRTC succeeds, but the external signaling service is required to establish calls.
- The voice announcer uses the browser's `speechSynthesis`, not an external AI voice model. Voice announcements vary by browser and installed voices.
- Never upload passwords, tokens, API keys or `.env` files to the public GitHub repository.
- Current Render auto-deploy is **On Commit**, not CI-gated by default.
