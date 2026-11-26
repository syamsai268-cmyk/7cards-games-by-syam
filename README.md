# 7Cards Games — By Syam v1.7

Private friends' Sevens and bot play on the existing Render website.

### New in v1.7 — Sevens lounge

- New mobile-first **Take a seat** start screen with name, optional room code, and **Open Table** action.
- Four selectable felt themes: **Ocean**, **Classic green**, **Galaxy**, and **Neon night**. Saved locally per device.
- Animated fanned playing cards; animations can be disabled in the Themes panel.
- Compact table showing played card faces with rank and suit plus frontier slots, instead of 52 tiny placeholders.
- Folded card hand for phone-sized screens; legal cards glow to show what can be played.
- Friends room invite control in the toolbar and a compact chat overlay on phones.
- Existing 52-card Sevens gameplay, bots, invite links, leaderboard, voice, unlimited rounds and end-match scoring preserved.

### Testing

`npm install`, `npm test` (two-player room + voice relay), `node --check app.js`, `node scripts/check-release.mjs`.

### Deployment

GitHub `main` is linked to the existing Render static site. The game's URL remains:
https://sevencards-games-by-syam.onrender.com

Room server: https://sevencards-room-relay-syam.onrender.com/health

Friends and mic audio need final two-real-device checks. The host must keep the game tab open. No payment or betting.
