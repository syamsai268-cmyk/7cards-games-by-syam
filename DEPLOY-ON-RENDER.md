# Deploy 7Cards Games by Syam to Render

This package is a fully static website. It supports bot play locally, and browser-to-browser friend rooms while the host remains online.

**Recommended deployment**

1. Unzip this package.
2. Create a new GitHub repository and upload the contents of the extracted folder to its root (`index.html`, `app.js`, `styles.css`, `render.yaml` etc.).
3. Sign in at https://dashboard.render.com and connect your GitHub account/repository.
4. Create **New > Static Site** using that repository. Suggested Name: `7cards-games-by-syam` (subject to availability). Build Command: `echo No build required`; Publish Directory: `.`.
   Alternatively, create **New > Blueprint** with the repository to use the supplied `render.yaml`.
5. After a successful deployment, Render displays your actual live URL (ending with `.onrender.com`). Share it with friends. Do not guess the name before deployment.

**Important:** A public site URL does NOT mean your multiplayer game server is always running. Online multiplayer here is peer-to-peer through PeerJS; the game host must stay online. Bots work offline after assets are cached. Browser/WebRTC restrictions or PeerJS service outages can interrupt online play.
