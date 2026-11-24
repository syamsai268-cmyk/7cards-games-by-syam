# 7Cards Games — By Syam (v1.5)

## Friends room connection fix

Online card-game messages now use a dedicated WebSocket relay instead of peer-to-peer data channels. This avoids many cross-network/mobile NAT errors. Human players still join by the same private link; the room host must keep the game tab open. If the room is unavailable or has ended, the join screen displays a clear error instead of an endless spinner.

- Game website: https://sevencards-games-by-syam.onrender.com
- WebSocket relay: https://sevencards-room-relay-syam.onrender.com/health
- Relay WebSocket endpoint: wss://sevencards-room-relay-syam.onrender.com/ws
- 52 cards, 7♥ starts, unlimited rounds, lowest penalty wins
- Sound and Voice controls on mobile remain visible
- Voice chat still uses separate PeerJS media calls and requires microphone permission; some mobile networks may restrict those calls. Game-room connectivity does not depend on voice service.

To validate: `npm install`, `npm test`, and `node scripts/check-release.mjs`.
