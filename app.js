(() => {
'use strict';
const store = (() => {try {const s=window.localStorage;s.getItem('syam7-check');return s;}catch{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}})();
const setRoute = path => {try {history.replaceState(null,'',path);}catch{}};
const $ = (q) => document.querySelector(q);
const app = $('#app');
const SUITS = ['H', 'D', 'C', 'S'];
const SUIT_ICONS = {H:'♥',D:'♦',C:'♣',S:'♠'};
const SUIT_NAMES = {H:'Hearts',D:'Diamonds',C:'Clubs',S:'Spades'};
const BOT_NAMES = ['Royal Bot', 'Mira Bot', 'Ravi Bot', 'Nova Bot', 'Blaze Bot', 'Pixel Bot', 'Tara Bot'];
const BOT_EMOJIS = ['🤖','🦊','🎮','✨','🔥','🧠','⭐'];
const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let peer = null, guestConn = null, hostRoom = null, currentView = null;
const RELAY_URL = 'wss://sevencards-room-relay-syam.onrender.com/ws';
let relaySocket = null;
const relayPeers = new Map();
let conns = new Map(), myId = '', role = '', isSolo = false;
let screen = new URLSearchParams(location.search).get('room') ? 'join' : 'home';
let gameCode = String(new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
let playerName = store.getItem('syam7-name') || (gameCode ? 'Player' : 'Syam');
let audioEnabled = store.getItem('syam7-sound') !== 'off';
let announcerEnabled = store.getItem('syam7-announcer') === 'on';
let lastAnnouncedAction = '';
let voiceStream = null;
let voiceMuted = false;
let voiceStarting = false;
let voiceMenuOpen = false;
let themeMenuOpen = false;
let chatMenuOpen = false;
let tableTheme = ['ocean','classic','galaxy','neon'].includes(store.getItem('syam7-theme')) ? store.getItem('syam7-theme') : 'ocean';
let animationsEnabled = store.getItem('syam7-motion') !== 'off';
const themeLabels = {ocean:'Ocean',classic:'Classic green',galaxy:'Galaxy',neon:'Neon night'};

// Microphone packets are relayed by the dedicated room WebSocket; no PeerJS calls.

let toastTimeout = null, botTimeout = null, joinTimeout = null;
let loadingMessage = '', lastError = '';
const getSavedSolo = () => {try {const a=JSON.parse(store.getItem('syam7-solo-v3-k44'));return a?.phase?a:null;}catch{return null;}};
const html = (x='') => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valueName = r => ({11:'J',12:'Q',13:'K'}[r]||String(r));
const packCard = c => c.suit + c.rank;
const rankPoints = c => c.rank;
const uid = () => (globalThis.crypto?.randomUUID?.() || String(Date.now())+'-'+String(Math.random()).slice(2));
const randCode = () => {let c='';for(let i=0;i<6;i++)c+=letters[Math.floor(Math.random()*letters.length)];return c;};
const allCards = () => SUITS.flatMap(suit=>Array.from({length:11},(_,i)=>({suit,rank:i+3})));
const shuffle = deck => {for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;};
const sortedHand = h => [...(h||[])].sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||a.rank-b.rank);
function legalMoves(hand, board) {
  if(!board?.H) return (hand||[]).filter(c=>c.suit==='H'&&c.rank===7);
  return (hand||[]).filter(c => {
    const lane=board[c.suit];
    return lane ? (lane.lo>3 && c.rank===lane.lo-1) || (lane.hi<13 && c.rank===lane.hi+1) : c.rank===7;
  });
}
function turnPlayer(room) {return room.seats[room.game.turnIndex];}
function logSystem(message) {if(!hostRoom)return;hostRoom.chat.push({system:true,text:message});hostRoom.chat=hostRoom.chat.slice(-80);}
function sound(type='play') {if(!audioEnabled)return;try{const context=new (window.AudioContext||window.webkitAudioContext)();const o=context.createOscillator();const g=context.createGain();o.connect(g);g.connect(context.destination);o.type='sine';o.frequency.setValueAtTime(type==='win'?640:420,context.currentTime);o.frequency.exponentialRampToValueAtTime(type==='win'?990:260,context.currentTime+.13);g.gain.setValueAtTime(.08,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.16);o.start();o.stop(context.currentTime+.17);setTimeout(()=>context.close(),380);}catch{}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),3000);}
function themePanel(){
 return '<section class="theme-popover" aria-label="Table appearance"><div class="theme-heading"><span>Customize your table</span><button class="smallbtn" data-action="theme-menu" aria-label="Close themes">✕</button></div><div class="theme-options">'+
 Object.entries(themeLabels).map(([id,label])=>'<button class="theme-choice '+(tableTheme===id?'selected':'')+'" data-action="theme-select" data-theme="'+id+'"><span class="theme-dot theme-dot-'+id+'"></span><span>'+label+'</span>'+(tableTheme===id?' <span aria-hidden="true">✓</span>':'')+'</button>').join('')+
 '</div><label class="motion-toggle" for="animationCheck"><span>✨ Card animations</span><input type="checkbox" id="animationCheck" '+(animationsEnabled?'checked':'')+'></label></section>';
}
function header(){
 const inMatch=screen==='room'&&currentView?.phase==='playing';
 const inRoom=screen==='room'&&!!currentView;
 return '<header class="topbar '+(inMatch?'topbar-match':'')+'"><div class="brand"><div class="brand-icon">7♥</div><div><div class="brand-name">7Cards <span>Games</span></div><div class="byline">MADE BY SYAM <span class="version-mark">V1.7.1</span></div></div></div>'+
 '<div class="top-actions">'+
 (inRoom?'<button class="pill room-pill" data-action="copy" title="Copy the room invite">🔗 '+html(currentView.code)+' ⧉</button>':'')+
 '<div class="theme-anchor"><button class="pill theme-trigger" data-action="theme-menu" aria-expanded="'+themeMenuOpen+'" title="Change table theme" aria-label="Table themes">🎨 <span class="desktop-label">Themes</span></button>'+(themeMenuOpen?themePanel():'')+'</div>'+
 '<button class="pill sound-trigger" data-action="sound" title="Toggle sounds">'+(audioEnabled?'🔊':'🔇')+' <span class="desktop-label">Sound</span></button>'+
 '<div class="voice-anchor"><button class="pill voice-trigger '+(voiceStream?'voice-live':'')+'" data-action="voice-menu" aria-controls="voicePopover" aria-expanded="'+voiceMenuOpen+'" aria-label="Friends voice chat">🎙️ <span class="desktop-label">'+(voiceStream?(voiceMuted?'Muted':'Voice on'):'Voice')+'</span></button>'+(voiceMenuOpen?voicePanel(inRoom?currentView:null):'')+'</div>'+
 (inMatch?'<button class="pill chat-trigger '+(chatMenuOpen?'chat-active':'')+'" data-action="chat-menu" title="Friends chat" aria-label="Open friends chat">💬</button>':'')+
 (screen!=='home'?'<button class="pill home-trigger" data-action="home" title="Go home">⌂ <span class="desktop-label">Home</span></button>':'')+
 '</div></header>';
}

function footer(){return '<footer class="footer">7Cards Games • Made with ♥ by Syam • Play fair, play together • No real-money betting</footer>';}
function homeView(){
 const saved=getSavedSolo();
 return '<section class="welcome-page"><div class="welcome-badge"><span class="live-dot"></span> LIVE FRIENDS CARD TABLE</div>'+
 '<div class="welcome-art" aria-hidden="true"><div class="welcome-card wc-spade"><span>7♠</span><strong>♠</strong><small>7</small></div><div class="welcome-card wc-club"><span>7♣</span><strong>♣</strong><small>7</small></div><div class="welcome-card wc-diamond"><span>7♦</span><strong>♦</strong><small>7</small></div><div class="welcome-card wc-heart"><span>7♥</span><strong>♥</strong><small>7</small></div></div>'+
 '<div class="welcome-kicker">SEVENS • THE CLASSIC CARD GAME</div><h1 class="welcome-title">Sevens</h1><p class="welcome-sub">7Cards Games <span>·</span> Created by Syam</p>'+
 '<section class="welcome-panel"><h2>Take a seat</h2><p>Pick your name, create a private table or join friends with a room code.</p>'+
 '<div class="field"><label for="yourName">Your name</label><input id="yourName" maxlength="22" autocomplete="nickname" value="'+html(playerName)+'" placeholder="Your name"></div>'+
 '<div class="field"><label for="joinCode">Room code <span class="muted">· optional</span></label><input id="joinCode" maxlength="8" autocomplete="off" style="text-transform:uppercase" placeholder="Leave blank for a new table"></div>'+
 '<button class="btn primary welcome-start" data-action="quick-start">Open Table <span>→</span></button>'+
 '<div class="welcome-alt"><button class="btn secondary" data-action="solo">🤖 Practice vs Bots</button><button class="btn tertiary" data-action="rules" aria-label="How to play">ⓘ</button></div>'+
 (saved?'<button class="welcome-resume" data-action="resume">↺ Resume your previous bot game</button>':'')+
 '</section><p class="welcome-footnote">44 cards · No Aces or 2s · Unlimited rounds · Private invites · Voice with friends</p></section>';
}

function friendsView() {return `<section class="setup surface"><div class="section-header"><h2>Create a friends room ♣</h2><button class="smallbtn" data-action="home">← Back</button></div><p class="setup-intro">Open your own private card table, invite friends using a shareable link, and optionally add bots before you begin. Play unlimited rounds and end the match whenever your group is ready.</p><div class="field"><label for="yourName">Your player name</label><input id="yourName" maxlength="22" value="${html(playerName)}" placeholder="Your name"></div><div class="setup-buttons"><button class="btn primary" data-action="create-online">🔗 Create private room →</button><button class="btn secondary" data-action="join-screen">Join someone else’s room</button></div><p class="hint">The host browser stays open during the match. Use a hosted HTTPS link for online multiplayer.</p></section>`;}
function joinView() {return `<section class="setup surface"><div class="section-header"><h2>Join the table ♠</h2><button class="smallbtn" data-action="home">← Back</button></div><p class="setup-intro">Join your friends using their invite link or 6-character room code. Everyone plays in their own browser.</p>${gameCode?`<div class="join-banner">🔗 <div><strong>You've been invited!</strong><div class="muted">Room: ${html(gameCode)}</div></div></div>`:''}<div class="field"><label for="yourName">Your player name</label><input id="yourName" maxlength="22" value="${html(playerName)}" placeholder="Your name"></div><div class="field"><label for="joinCode">Room code</label><input id="joinCode" maxlength="8" style="letter-spacing:3px;text-transform:uppercase" value="${html(gameCode)}" placeholder="ABC123"></div><div class="setup-buttons"><button class="btn primary" data-action="join">Join room →</button><button class="btn tertiary" data-action="solo">Play bots instead</button></div>${lastError?`<p class="hint" style="color:#ffd4ab;font-weight:800">⚠️ ${html(lastError)}</p>`:''}<p class="hint">The room host needs to stay online while everyone plays. Online mode requires an internet connection.</p></section>`;}
function loadingView(){return `<section class="setup surface loading"><div class="spinner"></div><h2>${html(loadingMessage||'Connecting...')}</h2><p class="muted">${html(lastError||'Connecting players securely through the online room service.')}</p><button class="btn tertiary" data-action="home">Cancel</button></section>`;}
function playerChip(p,idx) {const active=currentView.game&&currentView.game.turnId===p.id;return `<div class="player ${active?'active':''} ${p.id===myId?'me':''}"><div class="player-name">${p.isBot?BOT_EMOJIS[idx%BOT_EMOJIS.length]:'👤'} ${html(p.name)} ${p.id===myId?'(You)':''}</div><div class="player-stat"><span>🃏 ${p.cardCount} cards</span><span>${active?'<span class="player-dot">● TURN</span>':p.isBot?'BOT':p.online?'ONLINE':'AUTO BOT'}</span></div></div>`;}
function lobbyView(){const v=currentView;return `<section class="setup surface" style="max-width:900px"><div class="section-header"><h2>${isSolo?'Play with bots 🤖':'Private game lobby ♣'}</h2><span class="tag accent">${v.players.length}/8 players</span></div><p class="setup-intro">${isSolo?'Choose how many bots to face, then start the match.':'Invite friends to your private table. You can also add bots to fill empty seats.'}</p>${!isSolo?`<div class="invite"><div><small>ROOM CODE</small><div class="room-code">${html(v.code)}</div></div><div class="invite-actions"><button class="btn primary" data-action="copy">⧉ Copy link</button><button class="btn tertiary" data-action="share">↗ Share</button></div></div>`:''}
<div class="section-header" style="margin-top:24px"><h2 style="font-size:20px">Players at the table</h2>${v.isHost?'<button class="smallbtn" data-action="add-bot">+ Add a bot</button>':''}</div><div class="lobby-players">${v.players.map((p,i)=>`<div class="lobby-person"><div><b>${p.isBot?'🤖':'👤'} ${html(p.name)} ${p.id===myId?'(You)':''}</b><small>${p.isBot?'Computer player':p.isHost?'Room host':p.online?'Ready to play':'Disconnected'}</small></div>${v.isHost&&p.id!==myId?`<button class="icon-button" data-action="remove-player" data-player="${html(p.id)}" title="Remove player">✕</button>`:''}</div>`).join('')}</div>
<div class="setup-row" style="margin-top:18px"><div class="field"><label>Rounds</label><div class="tag accent" style="padding:15px">♾ Unlimited — host ends the match</div></div><div class="field"><label>Scoring</label><div class="tag" style="padding:15px">3 = 3 · 10 = 10 · J = 11 · Q = 12 · K = 13</div></div></div>
<div class="setup-buttons">${v.isHost?`<button class="btn primary" data-action="start" ${v.players.length<2?'disabled':''}>▶ Start game</button>`:'<div class="tag accent" style="padding:15px">Waiting for the host to start…</div>'}<button class="btn tertiary" data-action="rules">📖 Rules</button></div><p class="smallnote">A match needs 2–8 players. With an odd player count, some players may receive one extra card. Bot turns are automatic.</p></section>`;}
function boardView(board,lastCard){
 const rows=SUITS.map(s=>{
  const lane=board[s];
  const ranks=lane ? Array.from({length:lane.hi-lane.lo+1},(_,i)=>lane.lo+i) : [];
  const content=[];
  if(!lane){
   content.push('<span class="table-slot empty-seven" title="Play the seven of '+SUIT_NAMES[s]+' to open this suit"><span>'+SUIT_ICONS[s]+'</span><b>7</b></span>');
  }else{
   if(lane.lo>3)content.push('<span class="table-slot next-slot" title="Next: '+valueName(lane.lo-1)+' '+SUIT_ICONS[s]+'">'+valueName(lane.lo-1)+'</span>');
   for(const rank of ranks){
    const isLatest=lastCard?.suit===s&&lastCard?.rank===rank;
    const label=valueName(rank)+' of '+SUIT_NAMES[s];
    content.push('<span class="table-played suit-'+s+' '+(rank===7?'seven ':'')+(isLatest?'highlight':'')+'" title="'+label+'" aria-label="'+label+' played" data-placed-card="'+s+rank+'"><span class="table-rank">'+valueName(rank)+'</span><span class="table-icon">'+SUIT_ICONS[s]+'</span><span class="table-invert">'+valueName(rank)+'</span></span>');
   }
   if(lane.hi<13)content.push('<span class="table-slot next-slot" title="Next: '+valueName(lane.hi+1)+' '+SUIT_ICONS[s]+'">'+valueName(lane.hi+1)+'</span>');
  }
  return '<div class="felt-row"><div class="felt-suit suit-'+s+'" title="'+SUIT_NAMES[s]+'">'+SUIT_ICONS[s]+'</div><div class="felt-track" role="group" aria-label="'+SUIT_NAMES[s]+' cards">'+content.join('')+'</div></div>';
 }).join('');
 return '<div class="board felt-board"><div class="felt-heading">THE SEVENS TABLE <span>♦ ♣ ♥ ♠</span></div><div class="board-scroll" role="region" aria-label="Cards on the table" tabindex="0">'+rows+'</div><p class="felt-caption">Build each suit from 7 down to 3 and up to King · Aces and 2s removed</p></div>';
}

function cardElement(card,legal){const c=packCard(card);return `<button class="playingcard suit-${card.suit} ${card.suit==='H'||card.suit==='D'?'red':''} ${legal?'legal':'locked'}" data-action="play" data-card="${c}" data-rank="${valueName(card.rank)}" data-suit="${SUIT_ICONS[card.suit]}" ${legal?'':'disabled'} title="${valueName(card.rank)} of ${SUIT_NAMES[card.suit]}${legal?' – Tap to play':''}"><span><span class="toprank">${valueName(card.rank)}</span><br><span class="topsuit">${SUIT_ICONS[card.suit]}</span></span><span class="center-suit">${SUIT_ICONS[card.suit]}</span></button>`;}
function scoreView(v){return `<section class="panel surface"><h3 class="side-title">🏆 Leaderboard</h3><table class="scoretable"><thead><tr><th>Player</th><th>Penalty</th></tr></thead><tbody>${[...v.players].sort((a,b)=>a.score-b.score).map((p,i)=>`<tr><td>${i===0?'🥇 ':''}${html(p.name)}${p.id===myId?' · You':''}</td><td class="${i===0?'score-gold':''}">${p.score}</td></tr>`).join('')}</tbody></table><p class="smallnote">Lowest total penalty is best. Scores add after each round.</p></section>`;}
function voicePanel(v){
  const online=screen==='room'&&!isSolo&&!!v;
  const joined=online?(v.voicePeers||[]).filter(x=>x.voiceOn&&!x.isBot).length:0;
  return `<section class="voice-popover" id="voicePopover" aria-label="Voice settings">
    <div class="voice-pop-title">🎙️ Voice & sound</div>
    ${online?`<p class="voice-pop-desc">Talk to friends in this room. Microphone access is optional.</p><div class="voice-actions"><button class="btn ${voiceStream?'tertiary':'primary'}" data-action="voice-toggle">${voiceStream?'🔌 Leave voice':'🎙️ Join voice'}</button>${voiceStream?`<button class="btn ${voiceMuted?'primary':'tertiary'}" data-action="voice-mute">${voiceMuted?'🎤 Unmute':'🔇 Mute'}</button>`:''}${voiceStream?'<button class="btn tertiary" data-action="voice-test">🔊 Test speaker</button>':''}</div><div class="voice-members">${(v.voicePeers||[]).filter(x=>!x.isBot).map(x=>`<span class="voice-member ${x.voiceOn?'talking-enabled':''}">${x.voiceOn?(x.voiceMuted?'🔇':'🎙️'):'○'} ${html(x.name)}${x.id===myId?' (You)':''}</span>`).join('')}</div><p class="voice-pop-desc" id="voiceReceiveStatus">${joined} in voice · headphones recommended · ${voiceStream?'Mic ON':'Mic OFF'}</p>`:'<p class="voice-pop-desc">Live voice chat works in friends rooms. You can still enable spoken card moves below.</p>'}
    <label class="voice-announce"><input type="checkbox" id="announcerCheck" ${announcerEnabled?'checked':''}> 🔊 Announce card moves aloud</label>
    <p class="voice-pop-foot">Voice audio is streamed within this room. No voice recordings are saved.</p>
  </section>`;
}
function chatView(v){return `<section class="panel surface"><h3 class="side-title">💬 Table talk</h3><div class="chatlog" id="chatlog">${(v.chat||[]).map(x=>`<div class="chat-line ${x.system?'system':''}">${x.system?html(x.text):`<b>${html(x.name)}:</b> ${html(x.text)}`}</div>`).join('')}</div><div class="chatbox"><input id="chatInput" type="text" placeholder="Say something nice…" maxlength="140" autocomplete="off"><button data-action="chat" title="Send message">➤</button></div><div class="reactions">${['👏','🔥','😎','❤️'].map(e=>`<button data-action="reaction" data-emoji="${e}" title="Send reaction">${e}</button>`).join('')}</div></section>`;}
function boardGameView(){
 const v=currentView,g=v.game,turn=g.turnId===myId,legal=new Set(v.legal.map(packCard));
 const who=v.players.find(p=>p.id===g.turnId);
 return '<div class="game-head modern-game-head"><h2>Round '+v.roundIndex+'</h2><div class="meta"><span class="tag accent">'+(turn?'● YOUR TURN':html(who?.name||'Player')+'’s turn')+'</span>'+
 (v.isHost?'<button class="smallbtn finish-match" data-action="end-match">🏁 End match</button>':'')+'</div></div>'+
 '<div class="game-layout modern-game-layout"><div class="game-main"><section class="panel surface modern-game-surface"><div class="players">'+v.players.map(playerChip).join('')+'</div>'+
 boardView(g.board,g.lastCard)+
 '<div class="hand-area"><div class="hand-head"><h3>YOUR HAND <span class="muted">('+v.myHand.length+')</span></h3><span class="status">'+(turn?(v.legal.length?'Tap the glowing card':'No playable card · pass'):('Waiting for '+html(who?.name||'player')))+'</span></div>'+
 '<div class="hand" aria-label="Your playing cards">'+(sortedHand(v.myHand).map(c=>cardElement(c,turn&&legal.has(packCard(c)))).join('')||'<div class="muted">Your hand is empty 🎉</div>')+'</div>'+
 '<div class="actions-row"><div class="turn-info">'+(g.lastAction?html(g.lastAction):'The 7♥ opens the game.')+'</div><button class="btn '+(turn&&!v.legal.length?'primary':'tertiary')+'" data-action="pass" '+(turn&&!v.legal.length?'':'disabled')+'>Pass turn →</button></div></div>'+
 '</section></div><aside class="sidebar">'+scoreView(v)+
 '<div class="chat-layer '+(chatMenuOpen?'chat-open':'')+'">'+chatView(v)+'<button class="chat-dismiss" data-action="chat-menu">Close chat ✕</button></div>'+
 (!isSolo?'<section class="panel surface invite-card"><h3 class="side-title">🔗 Friends room</h3><p class="smallnote">Keep this tab open while your friends play.</p><button class="btn tertiary" data-action="copy">Copy invite link ⧉</button></section>':'')+
 '</aside></div>';
}

function resultsView(){const v=currentView,final=v.phase==='finished';const r=v.lastRound||{points:{},winnerName:'',empty:''};const winnerScore=Math.min(...v.players.map(p=>p.score));const champs=v.players.filter(p=>p.score===winnerScore);const played=v.completedRounds||0;return `<section class="surface result"><div class="trophy">${final?'🏆':'🎉'}</div><div class="eyebrow">${final?'MATCH COMPLETE':'ROUND '+v.roundIndex+' COMPLETE'}</div><h2>${final?champs.map(x=>html(x.name)).join(' & ')+' wins!':html(r.winnerName)+' cleared their hand!'}</h2><p class="muted">${final?`After ${played} completed round${played===1?'':'s'}, the lowest total is <b style="color:var(--gold)">${winnerScore} points</b>.${played<v.roundIndex?' The unfinished round was not counted.':''}`: 'Cards left in hand are counted as penalty points. Lower is better! Play another round or end the match anytime.'}</p><div class="result-table">${[...v.players].sort((a,b)=>a.score-b.score).map((p,i)=>`<div class="result-row"><span>${i===0?'🥇 ':''}${html(p.name)} ${p.id===myId?'(You)':''}</span><span>${!final?`+${r.points[p.id]??0} · `:''}<b>${p.score} total</b></span></div>`).join('')}</div><div class="result-buttons">${v.isHost?final?'<button class="btn primary" data-action="rematch">↻ Start a new match</button>':`<button class="btn primary" data-action="next">▶ Play round ${v.roundIndex+1}</button><button class="btn secondary" data-action="end-match">🏁 End match & see winner</button>`:'<span class="tag accent" style="padding:15px">Waiting for the host…</span>'}<button class="btn tertiary" data-action="copy" ${isSolo?'disabled':''}>🔗 Copy invite</button><button class="btn tertiary" data-action="home">⌂ Home</button></div></section><div style="max-width:700px;margin:14px auto">${chatView(v)}</div>`;}
function render(){if(document.documentElement?.setAttribute){document.documentElement.setAttribute('data-theme',tableTheme);document.documentElement.classList?.toggle('no-motion',!animationsEnabled);}if(screen==='home')app.innerHTML=header()+homeView()+footer();else if(screen==='join')app.innerHTML=header()+joinView()+footer();else if(screen==='friends')app.innerHTML=header()+friendsView()+footer();else if(screen==='loading')app.innerHTML=header()+loadingView()+footer();else if(screen==='room'&&currentView){let body=currentView.phase==='lobby'?lobbyView():currentView.phase==='playing'?boardGameView():resultsView();app.innerHTML=header()+body+footer();const log=$('#chatlog');if(log)log.scrollTop=log.scrollHeight;syncVoice();announceMove();}else {screen='home';app.innerHTML=header()+homeView()+footer();}}
function makeRoom(code, solo, name) {const id='host-'+uid();return {code,solo,phase:'lobby',roundIndex:0,seats:[{id,name,isBot:false,score:0,connected:true,isHost:true}],chat:[],game:null,lastRound:null,history:[],owner:id};}
function getView(pid){const r=hostRoom;const g=r.game,player=r.seats.find(p=>p.id===pid);return {code:r.code,phase:r.phase,isHost:pid===r.owner,roundIndex:r.roundIndex,players:r.seats.map(p=>({id:p.id,name:p.name,score:p.score,isBot:p.isBot,isHost:!!p.isHost,online:p.connected,cardCount:g?.hands?.[p.id]?.length||0})),myHand:g?.hands?.[pid]||[],legal:r.phase==='playing'&&g?.turnId===pid?legalMoves(g.hands[pid],g.board):[],game:g?{board:g.board,turnId:g.turnId,lastCard:g.lastCard,lastAction:g.lastAction}:null,lastRound:r.lastRound,chat:r.chat.slice(-70),history:r.history.slice(-10),you:player?.name||'Player',voicePeers:r.seats.filter(x=>!x.isBot).map(x=>({id:x.id,name:x.name,peerId:x.peerId||null,voiceOn:!!x.voiceOn,voiceMuted:!!x.voiceMuted,isBot:false}))};}
function saveSolo(){if(hostRoom?.solo){try{store.setItem('syam7-solo-v3-k44',JSON.stringify(hostRoom));}catch{}}}
function broadcast(){if(!hostRoom)return;currentView=getView(hostRoom.owner);screen='room';saveSolo();render();for(const [pid,c] of conns){if(c.open)try{c.send({type:'state',view:getView(pid)});}catch{}};scheduleBot();}
function setupLocal(){stopNetwork();const name=saveName();role='host';isSolo=true;hostRoom=makeRoom('SOLO',true,name);myId=hostRoom.owner;addBot();addBot();broadcast();}

function stopNetwork(){
  stopVoice(false);
  clearTimeout(botTimeout); clearTimeout(joinTimeout);
  const ws=relaySocket; relaySocket=null;
  if(ws){ws.onmessage=null;ws.onclose=null;ws.onerror=null;try{ws.close();}catch{}}
  for(const c of relayPeers.values())try{c.disconnected();}catch{}
  relayPeers.clear();
  try{guestConn?.close();}catch{}
  try{peer?.destroy();}catch{}
  peer=null;guestConn=null;conns=new Map();hostRoom=null;currentView=null;role='';myId='';isSolo=false;
}
function relaySend(ws, message){
  if(ws?.readyState!==WebSocket.OPEN)return false;
  try{ws.send(JSON.stringify(message));return true;}catch{return false;}
}
function makeRelayGuestConnection(ws, channel){
  const handlers={data:[],close:[],error:[]};
  let active=true;
  const emit=(event,value)=>{for(const fn of handlers[event]||[])try{fn(value);}catch(e){console.warn(e);}};
  const c={
    peer:'relay-'+channel,
    get open(){return active && relaySocket===ws && ws.readyState===WebSocket.OPEN;},
    on(event,fn){if(handlers[event])handlers[event].push(fn);return c;},
    send(data){if(c.open)relaySend(ws,{type:'relay',channel,data});},
    close(){if(!active)return;active=false;relayPeers.delete(channel);relaySend(ws,{type:'kick',channel});emit('close');},
    deliver(data){if(active)emit('data',data);},
    disconnected(){if(!active)return;active=false;relayPeers.delete(channel);emit('close');}
  };
  return c;
}
function initVoicePeer(){ /* Room voice no longer depends on WebRTC peer signaling. */ }

function saveName(){const name=($('#yourName')?.value||playerName||'Player').trim().slice(0,22)||'Player';playerName=name;store.setItem('syam7-name',name);return name;}

function createOnline(){
  const name=saveName();stopNetwork();
  const code=randCode();gameCode=code;role='host';isSolo=false;
  hostRoom=makeRoom(code,false,name);myId=hostRoom.owner;
  screen='loading';loadingMessage='Creating friends room…';lastError='Connecting to the room service';render();
  const ws=new WebSocket(RELAY_URL);relaySocket=ws;
  joinTimeout=setTimeout(()=>{
    if(relaySocket===ws&&screen==='loading'){
      const message='Room server did not respond. Please try again.';
      stopNetwork();screen='friends';lastError=message;render();toast(message);
    }
  },65000);
  ws.onopen=()=>relaySend(ws,{type:'create',code});
  ws.onmessage=event=>{
    if(relaySocket!==ws)return;
    let m;try{m=JSON.parse(event.data);}catch{return;}
    if(m.type==='created'){
      clearTimeout(joinTimeout);
      setRoute(location.pathname+'?room='+code);
      logSystem('Room created! Share the invite link. Keep this tab open.');
      broadcast();
      initVoicePeer();
    }else if(m.type==='voice-audio'){
      handleVoiceAudio(m);
    }else if(m.type==='guest-open'){
      const channel=String(m.channel||'');
      if(!channel||relayPeers.has(channel))return;
      const c=makeRelayGuestConnection(ws,channel);
      relayPeers.set(channel,c);
      attachGuest(c);
      relaySend(ws,{type:'guest-ready',channel});
    }else if(m.type==='guest-close'){
      relayPeers.get(String(m.channel||''))?.disconnected();
    }else if(m.type==='data'){
      relayPeers.get(String(m.channel||''))?.deliver(m.data);
    }else if(m.type==='error'){
      const message=m.message||'Cannot create friends room.';
      if(screen==='loading'){stopNetwork();screen='friends';lastError=message;render();}
      toast(message);
    }
  };
  ws.onerror=()=>{lastError='Room service connection failed. Check your network.';};
  ws.onclose=()=>{
    if(relaySocket!==ws)return;
    const message=lastError||'Room server disconnected. Create another room.';
    stopNetwork();screen='friends';lastError=message;render();toast(message);
  };
}

function attachGuest(c){let pid=null;c.on('data',m=>{
 if(!m||typeof m!=='object')return;
 if(m.type==='join'){
  const id=String(m.token||'').slice(0,100),name=String(m.name||'Player').trim().slice(0,22)||'Player';
  if(!id.startsWith('p-')||id.length<20){c.send({type:'error',message:'Invalid player session.'});return;}
  let seat=hostRoom.seats.find(p=>p.id===id&&!p.isBot);
  if(!seat){if(hostRoom.phase!=='lobby'){c.send({type:'error',message:'This match has started. Ask the host to create another room.'});return;}
   if(hostRoom.seats.length>=8){c.send({type:'error',message:'This table is full (8 players).'});return;}
   seat={id,name,isBot:false,score:0,connected:true,isHost:false};hostRoom.seats.push(seat);logSystem(name+' joined the room.');
  } else {seat.connected=true;logSystem(seat.name+' reconnected.');}
  pid=seat.id;seat.peerId=c.peer?.startsWith('relay-')?null:c.peer;seat.voiceOn=false;seat.voiceMuted=false;const previous=conns.get(pid);if(previous&&previous!==c)try{previous.close()}catch{};conns.set(pid,c);c.send({type:'joined',id:pid});broadcast();return;
 }
 if(!pid)return;
 handleAction(pid,m);
});c.on('close',()=>{if(pid&&conns.get(pid)===c){conns.delete(pid);const p=hostRoom?.seats.find(x=>x.id===pid);if(p){p.connected=false;p.voiceOn=false;p.voiceMuted=false;p.peerId=null;logSystem(p.name+' disconnected. Auto-bot will cover their turns.');broadcast();}}});c.on('error',()=>{});}

function joinOnline(){
  const name=saveName();
  const code=String($('#joinCode')?.value||gameCode).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  if(code.length<6){toast('Enter a 6-character room code.');return;}
  stopNetwork();gameCode=code;role='guest';isSolo=false;screen='loading';
  loadingMessage='Joining room '+code+'…';lastError='Checking the invite link and room host';render();
  let token=store.getItem('syam7-token-'+code);
  if(!token||!token.startsWith('p-')){token='p-'+uid();store.setItem('syam7-token-'+code,token);}
  myId=token;
  const ws=new WebSocket(RELAY_URL);relaySocket=ws;
  guestConn={
    get open(){return relaySocket===ws&&ws.readyState===WebSocket.OPEN;},
    send(data){relaySend(ws,{type:'relay',data});},
    close(){try{ws.close();}catch{}}
  };
  joinTimeout=setTimeout(()=>{
    if(relaySocket===ws&&screen==='loading'){
      const message='Connection timed out. The server may be waking up, or the host has left. Try again.';
      stopNetwork();screen='join';lastError=message;render();toast(message);
    }
  },65000);
  ws.onopen=()=>relaySend(ws,{type:'join',code});
  ws.onmessage=event=>{
    if(relaySocket!==ws)return;
    let m;try{m=JSON.parse(event.data);}catch{return;}
    if(m.type==='connected'){
      guestConn.send({type:'join',token,name});
      initVoicePeer();
    }else if(m.type==='voice-audio'){
      handleVoiceAudio(m);
    }else if(m.type==='data'){
      const data=m.data;
      if(data?.type==='joined'){
        myId=data.id;setRoute(location.pathname+'?room='+code);
      }else if(data?.type==='state'){
        clearTimeout(joinTimeout);currentView=data.view;screen='room';lastError='';render();
      }else if(data?.type==='error'){
        const message=data.message||'Cannot join this room.';
        stopNetwork();screen='join';lastError=message;render();toast(message);
      }
    }else if(m.type==='error'){
      const message=m.message||'This room cannot be reached.';
      stopNetwork();screen='join';lastError=message;render();toast(message);
    }
  };
  ws.onerror=()=>{lastError='Room network connection failed. Check your internet and retry.';};
  ws.onclose=()=>{
    if(relaySocket!==ws)return;
    const message=lastError||'Disconnected from the room. Ask the host to keep the tab open.';
    stopNetwork();screen='join';lastError=message;render();toast(message);
  };
}

function addBot(){if(!hostRoom||hostRoom.seats.length>=8||hostRoom.phase!=='lobby')return false;const botCount=hostRoom.seats.filter(p=>p.isBot).length;const name=BOT_NAMES[botCount%BOT_NAMES.length];hostRoom.seats.push({id:'bot-'+uid(),name,isBot:true,score:0,connected:true,isHost:false});return true;}
function startRound(){if(!hostRoom||hostRoom.seats.length<2)return;const r=hostRoom;const deck=shuffle(allCards());const hands=Object.fromEntries(r.seats.map(p=>[p.id,[]]));deck.forEach((card,i)=>hands[r.seats[i%r.seats.length].id].push(card));const starterIndex=r.seats.findIndex(p=>hands[p.id].some(c=>c.suit==='H'&&c.rank===7));r.roundIndex++;r.phase='playing';r.lastRound=null;r.game={hands,board:{H:null,D:null,C:null,S:null},turnIndex:starterIndex,turnId:r.seats[starterIndex].id,lastCard:null,lastAction:'7♥ must be played first.'};logSystem('Round '+r.roundIndex+' started! '+r.seats[starterIndex].name+' holds 7♥.');broadcast();}
function completeRound(winner){const r=hostRoom,g=r.game;const points={};for(const p of r.seats){const earned=g.hands[p.id].reduce((n,c)=>n+rankPoints(c),0);p.score+=earned;points[p.id]=earned;}
 r.lastRound={points,winnerName:winner.name,winnerId:winner.id};r.history.push({round:r.roundIndex,points});r.phase='round_end';logSystem(winner.name+' finished round '+r.roundIndex+'. Play again or choose End match.');broadcast();}
function playCard(pid,card){const r=hostRoom,g=r?.game;if(!g||r.phase!=='playing'||turnPlayer(r)?.id!==pid)return;const current=g.hands[pid],pos=current.findIndex(c=>c.suit===card.suit&&c.rank===card.rank);if(pos<0||!legalMoves(current,g.board).some(c=>c.suit===card.suit&&c.rank===card.rank))return;
 current.splice(pos,1);const lane=g.board[card.suit];if(!lane)g.board[card.suit]={lo:7,hi:7};else{lane.lo=Math.min(lane.lo,card.rank);lane.hi=Math.max(lane.hi,card.rank);}
 const p=r.seats.find(x=>x.id===pid);g.lastCard=card;g.lastAction=p.name+' played '+valueName(card.rank)+SUIT_ICONS[card.suit];if(pid===myId)sound();if(!current.length){completeRound(p);return;}g.turnIndex=(g.turnIndex+1)%r.seats.length;g.turnId=turnPlayer(r).id;broadcast();}
function passTurn(pid){const r=hostRoom,g=r?.game;if(!g||r.phase!=='playing'||turnPlayer(r)?.id!==pid||legalMoves(g.hands[pid],g.board).length)return;const p=r.seats.find(x=>x.id===pid);g.lastAction=p.name+' passed (no playable cards).';g.turnIndex=(g.turnIndex+1)%r.seats.length;g.turnId=turnPlayer(r).id;broadcast();}
function scheduleBot(){clearTimeout(botTimeout);if(!hostRoom||hostRoom.phase!=='playing')return;const p=turnPlayer(hostRoom);if(!p||(!p.isBot&&p.connected))return;botTimeout=setTimeout(()=>{if(!hostRoom||hostRoom.phase!=='playing'||turnPlayer(hostRoom)?.id!==p.id)return;const legal=legalMoves(hostRoom.game.hands[p.id],hostRoom.game.board);if(!legal.length)passTurn(p.id);else {const scored=legal.map(c=>({c,score:c.rank+(c.rank===7?3:0)+Math.random()*5})).sort((a,b)=>b.score-a.score);playCard(p.id,scored[0].c);}},p.isBot?650:4800);}
function handleAction(pid,m){const r=hostRoom;if(!r||!m||typeof m!=='object')return;
 if(m.type==='play'){if(typeof m.card==='string'){const x=/^([HDCS])(1[0-3]|[1-9])$/.exec(m.card);if(x)playCard(pid,{suit:x[1],rank:Number(x[2])});}}else if(m.type==='pass')passTurn(pid);
 else if(m.type==='voice-state'){const p=r.seats.find(x=>x.id===pid&&x.connected&&!x.isBot);if(!p)return;p.voiceOn=!!m.enabled;p.voiceMuted=!!m.muted;if(typeof m.peerId==='string'&&m.peerId.length<100)p.peerId=m.peerId;broadcast();}
 else if(m.type==='chat'){const p=r.seats.find(x=>x.id===pid);if(!p)return;const str=String(m.text||'').trim().slice(0,140);if(!str)return;r.chat.push({name:p.name,text:str,system:false});r.chat=r.chat.slice(-80);broadcast();}
}
function hostControl(action,param){if(role!=='host'||!hostRoom)return;const r=hostRoom;
 if(action==='add-bot'){if(addBot()){broadcast();toast('Bot joined your table.');}else toast('Table full or game already started.');}
 else if(action==='remove-player'&&r.phase==='lobby'){const i=r.seats.findIndex(p=>p.id===param&&p.id!==r.owner);if(i<0)return;const [removed]=r.seats.splice(i,1);const c=conns.get(removed.id);if(c){try{c.send({type:'error',message:'The host removed you from the table.'});c.close()}catch{}conns.delete(removed.id);}broadcast();}
 else if(action==='start'&&r.phase==='lobby'&&r.seats.length>=2)startRound();
 else if(action==='next'&&r.phase==='round_end')startRound();
 else if(action==='rematch'&&r.phase==='finished'){for(const p of r.seats)p.score=0;r.roundIndex=0;r.history=[];r.lastRound=null;startRound();}
 else if(action==='end-match'&&['playing','round_end'].includes(r.phase)){if(r.phase==='playing')clearTimeout(botTimeout);r.phase='finished';r.game=null;const best=Math.min(...r.seats.map(p=>p.score));logSystem('Match ended by the host after '+r.history.length+' completed rounds. Winner: '+r.seats.filter(p=>p.score===best).map(p=>p.name).join(' & '));broadcast();}
}
// 7Cards v1.4: PeerJS/WebRTC opt-in audio chat. Each player must explicitly allow the microphone.
function audioRoot(){
 let root=document.getElementById('voice-audio-root');
 if(!root){root=document.createElement('div');root.id='voice-audio-root';root.setAttribute('aria-hidden','true');root.style.display='none';document.body.appendChild(root);}
 return root;
}
function announceMove(){
 if(!announcerEnabled||!currentView||currentView.phase!=='playing'||!('speechSynthesis' in window))return;
 const action=currentView.game?.lastAction||'';
 const key=currentView.code+'|'+currentView.roundIndex+'|'+action;
 if(!action||key===lastAnnouncedAction)return;
 lastAnnouncedAction=key;
 // Convert card suit symbols into clearly spoken names for the local browser announcer.
 const phrase=action.replace(/♥/g,' hearts').replace(/♦/g,' diamonds').replace(/♣/g,' clubs').replace(/♠/g,' spades');
 try{speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(phrase);speech.rate=1.04;speech.volume=.8;speechSynthesis.speak(speech);}catch{}
}

const VOICE_SAMPLE_RATE=16000;
const VOICE_MU=255;
const VOICE_LOG=Math.log1p(VOICE_MU);
const voiceDecodeLut=Float32Array.from({length:256},(_,i)=>{
 const y=i/127.5-1;
 return (y<0?-1:1)*Math.expm1(Math.abs(y)*VOICE_LOG)/VOICE_MU;
});
let voiceAudioContext=null;
let voiceInputNode=null;
let voiceProcessor=null;
let voiceSilentGain=null;
let voicePlaybackHeads=new Map();
let voiceSentPackets=0;
let voiceReceivedPackets=0;
function voiceStateChanged(){
 if(role==='host'&&hostRoom){
  const me=hostRoom.seats.find(x=>x.id===myId);
  if(me){me.voiceOn=!!voiceStream;me.voiceMuted=voiceMuted;}
  broadcast();
 }else if(role==='guest'&&guestConn?.open){
  guestConn.send({type:'voice-state',enabled:!!voiceStream,muted:voiceMuted});
 }
}
function syncVoice(){ /* Voice is now carried by the existing WebSocket room relay. */ }
function encodeVoiceSample(sample){
 const x=Math.max(-1,Math.min(1,sample||0));
 const compressed=(x<0?-1:1)*Math.log1p(VOICE_MU*Math.abs(x))/VOICE_LOG;
 return Math.max(0,Math.min(255,Math.round((compressed+1)*127.5)));
}
function decodeVoiceSample(code){return voiceDecodeLut[code&255];}
function sendMicrophoneAudio(input,sourceSampleRate){
 if(!voiceStream||voiceMuted||!relaySocket||relaySocket.readyState!==WebSocket.OPEN)return;
 if(relaySocket.bufferedAmount>100000)return; // Keep audio live instead of queueing stale sound.
 let energy=0;
 for(let i=0;i<input.length;i++)energy+=input[i]*input[i];
 if(energy/input.length<0.000009)return; // Avoid sending complete silence.
 const ratio=sourceSampleRate/VOICE_SAMPLE_RATE;
 const output=new Uint8Array(Math.ceil(input.length/ratio)+1);
 let n=0;
 for(let start=0;start<input.length;start+=ratio){
  const begin=Math.floor(start),end=Math.min(input.length,Math.max(begin+1,Math.floor(start+ratio)));
  let sum=0;
  for(let k=begin;k<end;k++)sum+=input[k];
  output[n++]=encodeVoiceSample(sum/(end-begin));
 }
 if(!n)return;
 const audio=btoa(String.fromCharCode(...output.subarray(0,n)));
 if(relaySend(relaySocket,{type:'voice-audio',audio}))voiceSentPackets++;
}
function handleVoiceAudio(message){
 if(!voiceStream||!voiceAudioContext||isSolo||!message||typeof message.audio!=='string')return;
 const from=String(message.from||'');
 if(!from||message.audio.length>12000)return;
 try{
  const bytes=atob(message.audio);
  if(!bytes.length||bytes.length>8192)return;
  const ctx=voiceAudioContext;
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const buffer=ctx.createBuffer(1,bytes.length,VOICE_SAMPLE_RATE);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<bytes.length;i++)samples[i]=decodeVoiceSample(bytes.charCodeAt(i));
  const src=ctx.createBufferSource();
  src.buffer=buffer;src.connect(ctx.destination);
  let start=voicePlaybackHeads.get(from);
  const now=ctx.currentTime;
  if(!Number.isFinite(start)||start<now+0.015||start>now+0.8)start=now+0.10;
  src.start(start);
  voicePlaybackHeads.set(from,start+buffer.duration);
  voiceReceivedPackets++;
  const state=document.getElementById('voiceReceiveStatus');
  if(state)state.textContent='🎧 Receiving voice audio ('+voiceReceivedPackets+' packets)';
 }catch(err){console.warn('Cannot decode room audio:',err);}
}
async function joinVoice(){
 if(voiceStarting||voiceStream||isSolo||screen!=='room'||!relaySocket||relaySocket.readyState!==WebSocket.OPEN){
  toast('Join an online friends room before enabling voice.');return;
 }
 if(!navigator.mediaDevices?.getUserMedia){
  toast('Microphone unavailable. Use Chrome on HTTPS and allow mic permission.');return;
 }
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context||!window.btoa||!window.atob){toast('Your browser does not support voice audio. Try Chrome.');return;}
 voiceStarting=true;
 let ctx=null,stream=null;
 try{
  ctx=new Context({latencyHint:'interactive'});
  await ctx.resume();
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(screen!=='room'||relaySocket?.readyState!==WebSocket.OPEN){
   stream.getTracks().forEach(t=>t.stop());await ctx.close();return;
  }
  if(typeof ctx.createScriptProcessor!=='function')throw new Error('Audio processing unavailable');
  const source=ctx.createMediaStreamSource(stream);
  const processor=ctx.createScriptProcessor(4096,1,1);
  const silent=ctx.createGain();silent.gain.value=0;
  processor.onaudioprocess=event=>{
   try{
    const input=event.inputBuffer.getChannelData(0);
    sendMicrophoneAudio(input,ctx.sampleRate);
   }catch(err){console.warn('Microphone audio processing failed:',err);}
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);
  voiceAudioContext=ctx;voiceInputNode=source;voiceProcessor=processor;voiceSilentGain=silent;
  voiceStream=stream;voiceMuted=false;voiceSentPackets=0;voiceReceivedPackets=0;
  voicePlaybackHeads.clear();
  voiceStateChanged();
  render();
  toast('🎙️ Microphone ready. Each friend must tap Voice → Join voice too.');
 }catch(err){
  try{stream?.getTracks().forEach(t=>t.stop());}catch{}
  try{await ctx?.close();}catch{}
  console.warn('Voice startup failed:',err);
  const message=err?.name==='NotAllowedError'
   ?'Microphone blocked. Allow the microphone in Chrome site permissions.'
   :err?.name==='NotFoundError'
    ?'No microphone found on this device.'
    :'Could not start audio. Check phone microphone permissions and retry.';
  toast(message);
 }finally{voiceStarting=false;}
}
function stopVoice(notify=true){
 const ctx=voiceAudioContext;
 const processor=voiceProcessor,source=voiceInputNode,gain=voiceSilentGain;
 if(processor){processor.onaudioprocess=null;try{processor.disconnect();}catch{}}
 if(source)try{source.disconnect();}catch{}
 if(gain)try{gain.disconnect();}catch{}
 try{voiceStream?.getTracks().forEach(t=>t.stop());}catch{}
 voiceStream=null;voiceMuted=false;voiceAudioContext=null;voiceInputNode=null;voiceProcessor=null;voiceSilentGain=null;
 voicePlaybackHeads.clear();
 if(ctx)try{ctx.close().catch(()=>{});}catch{}
 if(notify){voiceStateChanged();render();toast('Left voice chat. Microphone is off.');}
}
function toggleVoiceMute(){
 if(!voiceStream)return;
 voiceMuted=!voiceMuted;
 voiceStream.getAudioTracks().forEach(t=>t.enabled=!voiceMuted);
 voiceStateChanged();render();toast(voiceMuted?'Microphone muted':'Microphone unmuted');
}
function testVoiceSpeaker(){
 const ctx=voiceAudioContext;
 if(!ctx){toast('Join voice first to test your speaker.');return;}
 ctx.resume().then(()=>{
  const tone=ctx.createOscillator(),volume=ctx.createGain();
  tone.type='sine';tone.frequency.value=570;
  tone.connect(volume);volume.connect(ctx.destination);
  volume.gain.setValueAtTime(.001,ctx.currentTime);
  volume.gain.exponentialRampToValueAtTime(.15,ctx.currentTime+.03);
  volume.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);
  tone.start();tone.stop(ctx.currentTime+.32);
 }).catch(()=>toast('Audio output unavailable. Raise media volume and retry.'));
}

function inviteUrl(){if(!currentView||isSolo)return '';return location.origin+location.pathname+'?room='+encodeURIComponent(currentView.code);}
async function copyLink(){const url=inviteUrl();if(!url){toast('Invite links are for online rooms only.');return;}try{await navigator.clipboard.writeText(url);toast('Invite link copied! Send it to your friends.');}catch{const box=document.createElement('textarea');box.value=url;document.body.append(box);box.select();document.execCommand('copy');box.remove();toast('Invite link copied: '+url);}}
async function shareLink(){const url=inviteUrl();if(!url)return;if(navigator.share){try{await navigator.share({title:'Play 7Cards Games by Syam',text:'Join my private 7Cards game! 🃏',url});return;}catch{}}copyLink();}
function safeHome(){voiceMenuOpen=false;stopNetwork();setRoute(location.pathname);gameCode='';screen='home';render();}
app.addEventListener('click',async event=>{const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;
 switch(a){
 case 'rules': $('#rulesDialog').showModal();break;
 case 'theme-menu':themeMenuOpen=!themeMenuOpen;voiceMenuOpen=false;render();break;
 case 'theme-select':if(themeLabels[el.dataset.theme]){tableTheme=el.dataset.theme;store.setItem('syam7-theme',tableTheme);themeMenuOpen=false;render();}break;
 case 'chat-menu':chatMenuOpen=!chatMenuOpen;render();break;
 case 'quick-start':{const code=String($('#joinCode')?.value||'').trim();if(code)joinOnline();else createOnline();break;}
 case 'sound':audioEnabled=!audioEnabled;store.setItem('syam7-sound',audioEnabled?'on':'off');render();toast(audioEnabled?'Sound enabled':'Sound muted');break;
 case 'voice-menu':voiceMenuOpen=!voiceMenuOpen;themeMenuOpen=false;render();break;
 case 'home':safeHome();break;
 case 'solo':setupLocal();break;
 case 'resume':{const saved=getSavedSolo();if(saved){stopNetwork();hostRoom=saved;role='host';isSolo=true;myId=saved.owner;broadcast();}break;}
 case 'host':screen='friends';gameCode='';render();break;
 case 'create-online':createOnline();break;
 case 'join-screen':gameCode='';screen='join';render();break;
 case 'join':joinOnline();break;
 case 'copy':copyLink();break;
 case 'share':shareLink();break;
 case 'play':if(currentView?.phase==='playing'&&currentView?.game.turnId===myId){if(role==='host')handleAction(myId,{type:'play',card:el.dataset.card});else guestConn?.send({type:'play',card:el.dataset.card});}break;
 case 'pass':if(role==='host')handleAction(myId,{type:'pass'});else guestConn?.send({type:'pass'});break;
 case 'add-bot':case 'start':case 'next':case 'rematch':hostControl(a);break;
 case 'end-match':if(role==='host'&&hostRoom&&['playing','round_end'].includes(hostRoom.phase)){if(hostRoom.phase==='playing'&&!window.confirm('End this match now? The unfinished round will not count toward scores.'))break;hostControl('end-match');}break;
 case 'remove-player':hostControl(a,el.dataset.player);break;
 case 'chat':sendChat();break;
 case 'reaction':sendMessage(el.dataset.emoji);break;
 case 'voice-toggle':if(voiceStream)stopVoice();else await joinVoice();break;
 case 'voice-mute':toggleVoiceMute();break;
 case 'voice-test':testVoiceSpeaker();break;
 }
});
function sendMessage(text){if(role==='host')handleAction(myId,{type:'chat',text});else if(guestConn?.open)guestConn.send({type:'chat',text});}
function sendChat(){const input=$('#chatInput');if(!input)return;const txt=input.value.trim();if(txt){sendMessage(txt);input.value='';}}
app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='chatInput'){e.preventDefault();sendChat();}if(e.key==='Enter'&&e.target.id==='joinCode')joinOnline();});
app.addEventListener('change',e=>{if(e.target.id==='animationCheck'){animationsEnabled=!!e.target.checked;store.setItem('syam7-motion',animationsEnabled?'on':'off');render();return;}if(e.target.id==='announcerCheck'){announcerEnabled=!!e.target.checked;store.setItem('syam7-announcer',announcerEnabled?'on':'off');lastAnnouncedAction='';if(!announcerEnabled&&'speechSynthesis' in window)try{speechSynthesis.cancel();}catch{}return;}});
$('#rulesClose').addEventListener('click',()=>$('#rulesDialog').close());
$('#rulesDialog').addEventListener('click',e=>{if(e.target.id==='rulesDialog')$('#rulesDialog').close();});
window.Syam7Test={allCards,legalMoves,makeRoom,shuffle,packCard,boardView,getView,hostControl,getHostRoom:()=>hostRoom,voicePanel,header,encodeVoiceSample,decodeVoiceSample,handleVoiceAudio};
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});}
render();
})();
