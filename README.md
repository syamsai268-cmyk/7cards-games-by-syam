# 7Cards Games — By Syam v1.6

## Friends voice fix
Version 1.6 replaces PeerJS browser-to-browser audio with low-latency 16 kHz 8-bit mu-law microphone packets through the private room WebSocket relay. This does not require WebRTC NAT traversal or TURN servers. Audio is sent only while the microphone is enabled and is not recorded by the game.

**How to test on two phones:**
1. Both players open the new game version and join the same freshly created room.
2. Each taps **Voice → Join voice**, and allows microphone access.
3. Each taps **Test speaker** and checks the phone **media volume**.
4. Speak; the receiving phone should show **Receiving voice audio** in the Voice panel.
5. Tap Mute to stop sending, or Leave voice to stop capturing and receiving.

Use headphones to prevent feedback. Do not close or background the host's room tab. The room relay runs on Render's free web-service plan, so after being idle it may need to wake up. Real-world device and carrier behavior still need to be confirmed.

Game: https://sevencards-games-by-syam.onrender.com
Room relay: https://sevencards-room-relay-syam.onrender.com/health
