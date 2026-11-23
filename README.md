# 7Cards Games • By Syam

A beautiful, responsive, browser-based Sevens / 7 of Hearts card game. Play with automated bots or in a private online room with friends.

## Play immediately

Open `index.html` in Chrome/Edge/Firefox, then select **Play with bots**. Online multiplayer should be used on the hosted HTTPS version.

## Publish to a permanent URL (no coding required)

1. Go to https://app.netlify.com/drop
2. Upload the `7cards-games-by-syam.zip` file provided separately (or drag the entire `7cards-games-by-syam` folder containing `index.html`, `app.js`, and `styles.css`).
3. Netlify will give you a public link ending in `.netlify.app`. You can keep using that URL, rename the site in your dashboard, and update it later.
4. Visit your live link, choose **Play with friends**, enter your name, and press **Create new private room**.
5. Share the generated invitation link. Friends enter their own names and join from their phones or computers.

Note: I cannot publish a website to your personal hosting account without your authorization. Public URL is issued only after you deploy it.

## Rules

- 52 cards, no jokers. All cards shared as evenly as possible among 2–8 players.
- Whoever holds the 7♥ has the compulsory first move.
- Each suit is opened with its 7, then extends downward to Ace and upward to King, one rank at a time.
- Play one legal card on your turn, or pass only if none are playable.
- First person to empty their hand finishes the round. Each other player receives penalties equal to their remaining card ranks (Ace 1, Jack 11, Queen 12, King 13).
- Play 5–100 rounds. The lowest overall penalty score wins; ties are possible.

## Features

- Solo practice vs. bots, including game save/resume on the same browser
- 2–8 seats and bots in a friends room
- Private room codes and one-click shareable links
- Interactive card table, turn indicator, live leaderboard, chat, emoji reactions, sound toggle
- Responsive desktop and mobile layouts
- Installable as a home-screen app on supported browsers, with offline bot play after the first hosted visit
- Automatic bot substitution when an online guest disconnects
- No sign-up, money, or accounts required

## Online limitations

This first version uses PeerJS Cloud signaling and browser-to-browser WebRTC data channels, avoiding a separately hosted backend. The HOST is the game server while their browser is open. If the host closes or reloads the page, that online room stops and a new one must be created. The public PeerJS service is shared and does not guarantee connection uptime, especially on restrictive networks; very large volumes of users would warrant a dedicated backend. This is a casual social game, not an anti-cheat/ranked tournament system. Guest reconnection can work while the host remains online, by using the same room link on the same browser.

## Files

- `index.html`: site markup, instructions, app bootstrap
- `styles.css`: mobile-friendly visual design
- `app.js`: rules engine, turns, scoring, bots, room network, interface
- `favicon.svg`: icon

Created for Syam.
