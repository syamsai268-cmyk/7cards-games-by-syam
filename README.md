# 7Cards Games — By Syam v1.9.0

Private friends' Sevens and bot play on the existing Render website.

### New in v1.9.0 — Sevens lounge

- New mobile-first **Take a seat** start screen with name, optional room code, and **Open Table** action.
- Four selectable felt themes: **Ocean**, **Classic green**, **Galaxy**, and **Neon night**. Saved locally per device.
- Animated fanned playing cards; animations can be disabled in the Themes panel.
- Compact table showing played card faces with rank and suit plus frontier slots, instead of 44 placeholders.
- Folded card hand for phone-sized screens; legal cards glow to show what can be played.
- Friends room invite control in the toolbar and a compact chat overlay on phones.
- Updated 44-card Sevens gameplay, bots, invite links, leaderboard, voice, unlimited rounds and end-match scoring preserved.

### Testing

`npm install`, `npm test` (two-player room + voice relay), `node --check app.js`, `node scripts/check-release.mjs`.

### Deployment

GitHub `main` is linked to the existing Render static site. The game's URL remains:
https://sevencards-games-by-syam.onrender.com

Room server: https://sevencards-room-relay-syam.onrender.com/health

Friends and mic audio need final two-real-device checks. The host must keep the game tab open. No payment or betting.

### Rules update in v1.9.0

As requested, **all Aces and all 2s are removed** from the deck. Each suit now contains 3–10, J, Q and K (11 cards), for 44 cards total. The 7♥ still starts every round; cards extend each opened suit down to 3 and up to K. Aces and 2s are never dealt or scored. Old offline saves are not offered for resume because they used the 52-card rules.

### Version 1.7.2 — rooms and chat reliability

- Begins a nonblocking health request when a player opens the website so the Render free relay can begin waking before room creation; this may improve perceived start time but cannot remove provider cold starts.
- Shows a room network indicator (connected, checking, slow, or offline) with a manual health-check button. WebSocket ping/pong probes run while a room is connected.
- Allows **Retry connection** from the joining/creating screen and shows the previous error instead of an indefinite spinner.
- Adds **chat in the waiting lobby**, keeping the in-game and results chat, with a mobile chat button and a Close chat control.
- Keeps unsent chat text if the browser rerenders; refuses sending while disconnected and tells the player to retry.
- Keeps the existing 44-card, four-themes, voice, bots and unlimited rounds game.

The relay is still a **free Render web service**. Cold starts can take time, and browser/phone network interruptions can disconnect an in-progress room; an always-on paid service or a persistent-session backend would be needed to eliminate these limitations.

### v1.8: Free Voice Host + Public Games + Promotion

- **Syam’s Free Voice Host** uses the browser's `SpeechSynthesisUtterance` to speak a short welcome, the core rules, your turns, and round winners. Tap **Hear welcome** or **Enable voice host**. No paid voice API key is required, and playback depends on the phone/browser voice engine. This is a scripted guide, not a conversational AI.
- **Opt-in public rooms**: A private room remains unlisted unless its host selects the **Make this table public** checkbox or chooses **Make public** in the lobby. The public list shows host name, room code and occupancy and lists only open lobby games. Games disappear when play starts, the host makes the room private, or the host disconnects. Public listing does not enable anyone's microphone.
- **Public games**: Tap **Browse public tables** → Refresh → Join. Or **Host public table**.
- **Promote 7Cards**: Share via the phone’s native share sheet or WhatsApp. Invites promote the game URL; private game links still use the separate room invite action.
- **Privacy**: Optional voice chat requires explicit microphone permission. Public rooms are discoverable by strangers, so avoid using personal information as a player name. The free relay does not retain public listings across restarts.

The 44-card 3–King rules, mobile themes, bots, private invitations and unlimited rounds are unchanged.

### v1.9 — in-game team microphone and completely equal deals

**Mic like PUBG**: The previous Voice menu is removed. In any online friends or public room, a floating microphone dock appears on phones and desktops. Tap **Join mic** to request device microphone permission and listen/talk to other friends who also joined. Tap **Mute mic** to stop sending your voice while staying connected, tap **Unmute** to speak again, or tap **×** to leave team voice and turn off microphone capture. The dock shows how many other players joined and indicates audio received from others. The voice transport remains the existing optional audio relay; the microphone never activates automatically. Both devices must be in the same online room and have microphone permission; bot games have no team voice. Use headphones to avoid echo.

**44-card source deck, equal hands for any 2–8 seats**: All Aces and 2s remain removed. Every player receives `Math.floor(44 / playerCount)` cards. For counts that do not divide 44 evenly, the remainder is removed *before* the deal and does not score. Only Kings are set aside (one per randomly chosen suit), preserving a continuous 3→Q/K sequence and the mandatory 7♥ opener. The round UI and lobby show exact cards per player and number set aside. No player receives an extra card.

**Limits**: The Render free relay may sleep, so startup may be slow after idle. This is browser-based voice, not a standalone native PUBG application; actual audio reliability on multiple phones requires device testing. The public-room privacy opt-in and private invites remain unchanged.
