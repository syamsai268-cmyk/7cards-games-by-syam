# 7Cards Games — By Syam (v1.3.0)

A 52-card Sevens game for 2–8 players, with bots, private online rooms, 5–100 round scoring, in-room voice chat, chat, and leaderboard. No money involved.

## v1.3 — played-card face fix

- On the **table**, played cards show **rank and their real suit symbol**: 6♥, 7♦, 8♣, Q♠ etc.
- The table faces use the **exact same suit ink colors** as the cards in your hand: hearts pink-red, diamonds magenta, clubs green, spades navy.
- A placed card looks like a miniature real playing card, rather than a plain number.
- The last played card glows. Unplayed slots stay empty/dark.
- On narrow screens, swipe the board sideways to see all 13 ranks at readable size.
- Retains opt-in voice chat and speech announcer from v1.1.
- v1.3.0 CSS/JS asset URLs + service worker cache to minimize old cached screens.

## Existing repository and website

- GitHub: https://github.com/syamsai268-cmyk/7cards-games-by-syam
- Render: https://sevencards-games-by-syam.onrender.com
- Render service is linked to the `main` branch with auto-deploy on commit.

## Update from Windows PowerShell

1. Extract the v1.3 ZIP completely.
2. Verify Git is available: `git --version` (restart PowerShell if just installed).
3. Configure Git identity once with your own GitHub email:
   `git config --global user.name "Syam Sai"`
   `git config --global user.email "your-github-email@example.com"`
4. Run the included script from any directory:

   `powershell.exe -ExecutionPolicy Bypass -File "C:\Users\NIV-HAR-0798\Downloads\7cards-games-by-syam-v1.3\Update-GitHub-v1.3.ps1"`

   If extracted elsewhere, use the actual script path.
5. Git may ask for GitHub sign-in. Complete it.
6. After a successful `git push`, Render starts the deployment to the SAME website URL. Check its dashboard for `Live`.
7. Refresh the site (Ctrl+Shift+R), especially after a service worker update.

Alternative: upload all extracted files and the `.github` folder to the root of the existing GitHub repository on `main`; choose to replace existing files and commit.

## Tests

`node --check app.js`
`node --check sw.js`
`node scripts/check-release.mjs`

GitHub Actions runs these checks on pushes. Render currently deploys **on commit**, independently of test outcome. For test-gated deployment, change Render Auto Deploy to `After CI Checks Pass` if that option is available in your dashboard.

## Online voice privacy note

Voice requires each participant to press **Join voice**, allow the microphone and leave the host tab online. Browser WebRTC media is sent peer-to-peer, not recorded by this site. Real-device browser and network compatibility varies, so test on two devices.

## Version 1.3 mobile usability update

- 13 cards per suit always fit across the viewport, including narrow 320px phones.
- Every table card retains its rank, suit symbol, and distinct suit color.
- Compact horizontal player strip and small, bold hand cards improve tap targets and reachability.
- Use the included `Update-GitHub-v1.3.ps1` after extracting this release to push to GitHub; the existing Render static site follows `main`.
