(() => {
'use strict';
const store = (() => {try {const s=window.localStorage;s.getItem('syam7-check');return s;}catch{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}})();
const setRoute = path => {try {history.replaceState(null,'',path);}catch{}};
const $ = (q) => document.querySelector(q);
const app = $('#app');
const SUITS = ['H', 'D', 'C', 'S'];
const SUIT_ICONS = {H:'♥',D:'♦',C:'♣',S:'♠'};
const SUIT_NAMES = {H:'Hearts',D:'Diamonds',C:'Clubs',S:'Spades'};
const BOT_NAMES = ['Ace Bot', 'Mira Bot', 'Ravi Bot', 'Nova Bot', 'Blaze Bot', 'Pixel Bot', 'Tara Bot'];
const BOT_EMOJIS = ['🤖','🦊','🎮','✨','🔥','🧠','⭐'];
const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let peer = null, guestConn = null, hostRoom = null, currentView = null;
let conns = new Map(), myId = '', role = '', isSolo = false;
let screen = new URLSearchParams(location.search).get('room') ? 'join' : 'home';
let gameCode = String(new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
let playerName = store.getItem('syam7-name') || (gameCode ? 'Player' : 'Syam');
let audioEnabled = store.getItem('syam7-sound') !== 'off';
let toastTimeout = null, botTimeout = null, joinTimeout = null;
let loadingMessage = '', lastError = '';
const getSavedSolo = () => {try {const a=JSON.parse(store.getItem('syam7-solo-v1'));return a?.phase?a:null;}catch{return null;}};
const html = (x='') => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valueName = r => ({1:'A',11:'J',12:'Q',13:'K'}[r]||String(r));
const packCard = c => c.suit + c.rank;
const rankPoints = c => c.rank;
const uid = () => (globalThis.crypto?.randomUUID?.() || String(Date.now())+'-'+String(Math.random()).slice(2));
const randCode = () => {let c='';for(let i=0;i<6;i++)c+=letters[Math.floor(Math.random()*letters.length)];return c;};
const allCards = () => SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({suit,rank:i+1})));
const shuffle = deck => {for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;};
const sortedHand = h => [...(h||[])].sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||a.rank-b.rank);
function legalMoves(hand, board) {
  if(!board?.H) return (hand||[]).filter(c=>c.suit==='H'&&c.rank===7);
  return (hand||[]).filter(c => {
    const lane=board[c.suit];
    return lane ? c.rank===lane.lo-1 || c.rank===lane.hi+1 : c.rank===7;
  });
}
function turnPlayer(room) {return room.seats[room.game.turnIndex];}
function logSystem(message) {if(!hostRoom)return;hostRoom.chat.push({system:true,text:message});hostRoom.chat=hostRoom.chat.slice(-80);}
function sound(type='play') {if(!audioEnabled)return;try{const context=new (window.AudioContext||window.webkitAudioContext)();const o=context.createOscillator();const g=context.createGain();o.connect(g);g.connect(context.destination);o.type='sine';o.frequency.setValueAtTime(type==='win'?640:420,context.currentTime);o.frequency.exponentialRampToValueAtTime(type==='win'?990:260,context.currentTime+.13);g.gain.setValueAtTime(.08,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.16);o.start();o.stop(context.currentTime+.17);setTimeout(()=>context.close(),380);}catch{}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),3000);}
function header() {return `<header class="topbar"><div class="brand"><div class="brand-icon">7♥</div><div><div class="brand-name">7Cards <span>Games</span></div><div class="byline">CREATED BY SYAM</div></div></div><div class="top-actions"><button class="pill" data-action="rules">ⓘ &nbsp;How to play</button><button class="pill" data-action="sound">${audioEnabled?'♫ Sound on':'♪ Sound off'}</button>${screen!=='home'?'<button class="pill" data-action="home">⌂ &nbsp;Home</button>':''}</div></header>`;}
function footer(){return '<footer class="footer">7Cards Games • Made with ♥ by Syam • Play fair, play together • No real-money betting</footer>';}
function homeView() {const saved=getSavedSolo();return `
<section class="hero surface"><div><div class="eyebrow">✦ The classic game of Sevens</div><h1>One card.<br><em>Endless fun.</em></h1><p class="lead">Start with the <b>7 of Hearts</b>. Build every suit up and down. Outsmart your friends or battle clever bots. Lowest score wins!</p><div class="hero-actions"><button class="btn primary" data-action="solo">🤖 &nbsp;Play with bots</button><button class="btn secondary" data-action="host">♣ &nbsp;Play with friends</button><button class="btn tertiary" data-action="join-screen">↗ &nbsp;Join room</button>${saved?'<button class="btn tertiary" data-action="resume">↺ Resume solo game</button>':''}</div></div><div class="hero-art" aria-hidden="true"><div class="floatcard second"><span>7♠</span><b>♠</b><span>7</span></div><div class="floatcard third"><span>8♦</span><b>♦</b><span>8</span></div><div class="floatcard first"><span>7♥</span><b>♥</b><span>7</span></div></div></section>
<div class="subgrid"><div class="feature surface"><strong>🃏 Simple rules, real strategy</strong><p>52 cards, four suits, one winner. Everyone gets a turn.</p></div><div class="feature surface"><strong>🔗 Your private table</strong><p>Create a room and send your friends an invite link.</p></div><div class="feature surface"><strong>🏆 5–100 round matches</strong><p>Follow live scores and crown the lowest-point champion.</p></div></div>`;}
function friendsView() {return `<section class="setup surface"><div class="section-header"><h2>Create a friends room ♣</h2><button class="smallbtn" data-action="home">← Back</button></div><p class="setup-intro">Open your own private card table, invite friends using a shareable link, and optionally add bots before you begin. You control how many rounds to play.</p><div class="field"><label for="yourName">Your player name</label><input id="yourName" maxlength="22" value="${html(playerName)}" placeholder="Your name"></div><div class="setup-buttons"><button class="btn primary" data-action="create-online">🔗 Create private room →</button><button class="btn secondary" data-action="join-screen">Join someone else’s room</button></div><p class="hint">The host browser stays open during the match. Use a hosted HTTPS link for online multiplayer.</p></section>`;}
function joinView() {return `<section class="setup surface"><div class="section-header"><h2>Join the table ♠</h2><button class="smallbtn" data-action="home">← Back</button></div><p class="setup-intro">Join your friends using their invite link or 6-character room code. Everyone plays in their own browser.</p>${gameCode?`<div class="join-banner">🔗 <div><strong>You've been invited!</strong><div class="muted">Room: ${html(gameCode)}</div></div></div>`:''}<div class="field"><label for="yourName">Your player name</label><input id="yourName" maxlength="22" value="${html(playerName)}" placeholder="Your name"></div><div class="field"><label for="joinCode">Room code</label><input id="joinCode" maxlength="8" style="letter-spacing:3px;text-transform:uppercase" value="${html(gameCode)}" placeholder="ABC123"></div><div class="setup-buttons"><button class="btn primary" data-action="join">Join room →</button><button class="btn tertiary" data-action="solo">Play bots instead</button></div><p class="hint">The room host needs to stay online while everyone plays. Online mode requires an internet connection.</p></section>`;}
function loadingView(){return `<section class="setup surface loading"><div class="spinner"></div><h2>${html(loadingMessage||'Connecting...')}</h2><p class="muted">${html(lastError||'Connecting players securely through the online room service.')}</p><button class="btn tertiary" data-action="home">Cancel</button></section>`;}
function playerChip(p,idx) {const active=currentView.game&&currentView.game.turnId===p.id;return `<div class="player ${active?'active':''} ${p.id===myId?'me':''}"><div class="player-name">${p.isBot?BOT_EMOJIS[idx%BOT_EMOJIS.length]:'👤'} ${html(p.name)} ${p.id===myId?'(You)':''}</div><div class="player-stat"><span>🃏 ${p.cardCount} cards</span><span>${active?'<span class="player-dot">● TURN</span>':p.isBot?'BOT':p.online?'ONLINE':'AUTO BOT'}</span></div></div>`;}
function lobbyView(){const v=currentView;return `<section class="setup surface" style="max-width:900px"><div class="section-header"><h2>${isSolo?'Play with bots 🤖':'Private game lobby ♣'}</h2><span class="tag accent">${v.players.length}/8 players</span></div><p class="setup-intro">${isSolo?'Choose how many bots to face, then start the match.':'Invite friends to your private table. You can also add bots to fill empty seats.'}</p>${!isSolo?`<div class="invite"><div><small>ROOM CODE</small><div class="room-code">${html(v.code)}</div></div><div class="invite-actions"><button class="btn primary" data-action="copy">⧉ Copy link</button><button class="btn tertiary" data-action="share">↗ Share</button></div></div>`:''}
<div class="section-header" style="margin-top:24px"><h2 style="font-size:20px">Players at the table</h2>${v.isHost?'<button class="smallbtn" data-action="add-bot">+ Add a bot</button>':''}</div><div class="lobby-players">${v.players.map((p,i)=>`<div class="lobby-person"><div><b>${p.isBot?'🤖':'👤'} ${html(p.name)} ${p.id===myId?'(You)':''}</b><small>${p.isBot?'Computer player':p.isHost?'Room host':p.online?'Ready to play':'Disconnected'}</small></div>${v.isHost&&p.id!==myId?`<button class="icon-button" data-action="remove-player" data-player="${html(p.id)}" title="Remove player">✕</button>`:''}</div>`).join('')}</div>
<div class="setup-row" style="margin-top:18px"><div class="field"><label for="rounds">How many rounds?</label><input type="number" id="rounds" value="${v.targetRounds}" min="5" max="100" ${v.isHost?'':'disabled'}></div><div class="field"><label>Scoring</label><div class="tag" style="padding:15px">A = 1 · J = 11 · Q = 12 · K = 13</div></div></div>
<div class="setup-buttons">${v.isHost?`<button class="btn primary" data-action="start" ${v.players.length<2?'disabled':''}>▶ Start ${v.targetRounds}-round match</button>`:'<div class="tag accent" style="padding:15px">Waiting for the host to start…</div>'}<button class="btn tertiary" data-action="rules">📖 Rules</button></div><p class="smallnote">A match needs 2–8 players. With an odd player count, some players may receive one extra card. Bot turns are automatic.</p></section>`;}
function boardView(board,lastCard){return `<div class="board"><div class="board-label">THE CARD TABLE • BUILD FROM SEVENS</div>${SUITS.map(s=>`<div class="suit-row"><div class="suit-name" title="${SUIT_NAMES[s]}">${SUIT_ICONS[s]}</div><div class="suit-track">${Array.from({length:13},(_,i)=>{const rank=i+1, lane=board[s],played=lane&&rank>=lane.lo&&rank<=lane.hi, isLatest=lastCard?.suit===s&&lastCard?.rank===rank;return `<span class="boardcard ${s==='H'||s==='D'?'red':''} ${rank===7&&played?'seven':''} ${!played?'empty':''} ${isLatest?'highlight':''}" title="${played?`${valueName(rank)} of ${SUIT_NAMES[s]}`:'Empty'}">${played?valueName(rank):'·'}</span>`;}).join('')}</div></div>`).join('')}<div class="board-legend">A → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → J → Q → K</div></div>`;}
function cardElement(card,legal){const c=packCard(card);return `<button class="playingcard ${card.suit==='H'||card.suit==='D'?'red':''} ${legal?'legal':'locked'}" data-action="play" data-card="${c}" ${legal?'':'disabled'} title="${valueName(card.rank)} of ${SUIT_NAMES[card.suit]}${legal?' – Tap to play':''}"><span><span class="toprank">${valueName(card.rank)}</span><br><span class="topsuit">${SUIT_ICONS[card.suit]}</span></span><span class="center-suit">${SUIT_ICONS[card.suit]}</span></button>`;}
function scoreView(v){return `<section class="panel surface"><h3 class="side-title">🏆 Leaderboard</h3><table class="scoretable"><thead><tr><th>Player</th><th>Penalty</th></tr></thead><tbody>${[...v.players].sort((a,b)=>a.score-b.score).map((p,i)=>`<tr><td>${i===0?'🥇 ':''}${html(p.name)}${p.id===myId?' · You':''}</td><td class="${i===0?'score-gold':''}">${p.score}</td></tr>`).join('')}</tbody></table><p class="smallnote">Lowest total penalty is best. Scores add after each round.</p></section>`;}
function chatView(v){return `<section class="panel surface"><h3 class="side-title">💬 Table talk</h3><div class="chatlog" id="chatlog">${(v.chat||[]).map(x=>`<div class="chat-line ${x.system?'system':''}">${x.system?html(x.text):`<b>${html(x.name)}:</b> ${html(x.text)}`}</div>`).join('')}</div><div class="chatbox"><input id="chatInput" type="text" placeholder="Say something nice…" maxlength="140" autocomplete="off"><button data-action="chat" title="Send message">➤</button></div><div class="reactions">${['👏','🔥','😎','❤️'].map(e=>`<button data-action="reaction" data-emoji="${e}" title="Send reaction">${e}</button>`).join('')}</div></section>`;}
function boardGameView(){const v=currentView,g=v.game,turn=g.turnId===myId,legal=new Set(v.legal.map(packCard));const who=v.players.find(p=>p.id===g.turnId);return `<div class="game-head"><h2>Round ${v.roundIndex} <span class="muted">/ ${v.targetRounds}</span></h2><div class="meta"><span class="tag accent">${turn?'● YOUR TURN':`${html(who?.name||'Player')}’s turn`}</span>${!isSolo?`<span class="tag">Room ${html(v.code)}</span>`:''}</div></div><div class="game-layout"><div class="game-main"><section class="panel surface"><div class="players">${v.players.map(playerChip).join('')}</div>${boardView(g.board,g.lastCard)}<div class="hand-area"><div class="hand-head"><h3>🃏 Your hand <span class="muted">(${v.myHand.length})</span></h3><span class="status">${turn?(v.legal.length?'Tap a glowing card to play':'No legal card – pass your turn'):'Wait for your turn'}</span></div><div class="hand">${sortedHand(v.myHand).map(c=>cardElement(c,turn&&legal.has(packCard(c)))).join('')||'<div class="muted">Your hand is empty 🎉</div>'}</div><div class="actions-row"><div class="turn-info">${g.lastAction?html(g.lastAction):'The 7♥ opens the game.'}</div><button class="btn ${turn&&!v.legal.length?'primary':'tertiary'}" data-action="pass" ${turn&&!v.legal.length?'':'disabled'}>Pass turn →</button></div></div></section></div><aside class="sidebar">${scoreView(v)}${chatView(v)}${!isSolo?`<section class="panel surface"><h3 class="side-title">🔗 Friends room</h3><p class="smallnote">Share this link with friends to join. The host keeps the game running.</p><button class="btn tertiary" style="width:100%" data-action="copy">⧉ Copy invite link</button></section>`:''}</aside></div>`;}
function resultsView(){const v=currentView,final=v.phase==='finished';const r=v.lastRound||{points:{},winnerName:'',empty:''};const winnerScore=Math.min(...v.players.map(p=>p.score));const champs=v.players.filter(p=>p.score===winnerScore);return `<section class="surface result"><div class="trophy">${final?'🏆':'🎉'}</div><div class="eyebrow">${final?'MATCH COMPLETE':'ROUND '+v.roundIndex+' COMPLETE'}</div><h2>${final?champs.map(x=>html(x.name)).join(' & ')+' wins!':html(r.winnerName)+' cleared their hand!'}</h2><p class="muted">${final?`After ${v.targetRounds} rounds, the lowest total is <b style="color:var(--gold)">${winnerScore} points</b>.`: 'Cards left in hand are counted as penalty points. Lower is better!'}</p><div class="result-table">${[...v.players].sort((a,b)=>a.score-b.score).map((p,i)=>`<div class="result-row"><span>${i===0?'🥇 ':''}${html(p.name)} ${p.id===myId?'(You)':''}</span><span>${!final?`+${r.points[p.id]??0} · `:''}<b>${p.score} total</b></span></div>`).join('')}</div><div class="result-buttons">${v.isHost?final?'<button class="btn primary" data-action="rematch">↻ Play another match</button>':`<button class="btn primary" data-action="next">▶ Start round ${v.roundIndex+1}</button>`:'<span class="tag accent" style="padding:15px">Waiting for the host…</span>'}<button class="btn tertiary" data-action="copy" ${isSolo?'disabled':''}>🔗 Copy invite</button><button class="btn tertiary" data-action="home">⌂ Home</button></div></section><div style="max-width:700px;margin:14px auto">${chatView(v)}</div>`;}
function render(){if(screen==='home')app.innerHTML=header()+homeView()+footer();else if(screen==='join')app.innerHTML=header()+joinView()+footer();else if(screen==='friends')app.innerHTML=header()+friendsView()+footer();else if(screen==='loading')app.innerHTML=header()+loadingView()+footer();else if(screen==='room'&&currentView){let body=currentView.phase==='lobby'?lobbyView():currentView.phase==='playing'?boardGameView():resultsView();app.innerHTML=header()+body+footer();const log=$('#chatlog');if(log)log.scrollTop=log.scrollHeight;}else {screen='home';app.innerHTML=header()+homeView()+footer();}}
function makeRoom(code, solo, name) {const id='host-'+uid();return {code,solo,phase:'lobby',targetRounds:5,roundIndex:0,seats:[{id,name,isBot:false,score:0,connected:true,isHost:true}],chat:[],game:null,lastRound:null,history:[],owner:id};}
function getView(pid){const r=hostRoom;const g=r.game,player=r.seats.find(p=>p.id===pid);return {code:r.code,phase:r.phase,isHost:pid===r.owner,targetRounds:r.targetRounds,roundIndex:r.roundIndex,players:r.seats.map(p=>({id:p.id,name:p.name,score:p.score,isBot:p.isBot,isHost:!!p.isHost,online:p.connected,cardCount:g?.hands?.[p.id]?.length||0})),myHand:g?.hands?.[pid]||[],legal:r.phase==='playing'&&g?.turnId===pid?legalMoves(g.hands[pid],g.board):[],game:g?{board:g.board,turnId:g.turnId,lastCard:g.lastCard,lastAction:g.lastAction}:null,lastRound:r.lastRound,chat:r.chat.slice(-70),history:r.history.slice(-10),you:player?.name||'Player'};}
function saveSolo(){if(hostRoom?.solo){try{store.setItem('syam7-solo-v1',JSON.stringify(hostRoom));}catch{}}}
function broadcast(){if(!hostRoom)return;currentView=getView(hostRoom.owner);screen='room';saveSolo();render();for(const [pid,c] of conns){if(c.open)try{c.send({type:'state',view:getView(pid)});}catch{}};scheduleBot();}
function setupLocal(){stopNetwork();const name=saveName();role='host';isSolo=true;hostRoom=makeRoom('SOLO',true,name);myId=hostRoom.owner;addBot();addBot();broadcast();}
function stopNetwork(){clearTimeout(botTimeout);clearTimeout(joinTimeout);try{guestConn?.close()}catch{};try{peer?.destroy()}catch{};peer=null;guestConn=null;conns=new Map();hostRoom=null;currentView=null;role='';myId='';isSolo=false;}
function saveName(){const name=($('#yourName')?.value||playerName||'Player').trim().slice(0,22)||'Player';playerName=name;store.setItem('syam7-name',name);return name;}
function createOnline(){const name=saveName();stopNetwork();if(!window.Peer){toast('Online library failed to load. Try again with internet.');return;}
 const code=randCode();gameCode=code;role='host';isSolo=false;hostRoom=makeRoom(code,false,name);myId=hostRoom.owner;screen='loading';loadingMessage='Creating your friend room…';lastError='';render();
 peer=new Peer('7cards-syam-'+code.toLowerCase(),{debug:0});
 peer.on('open',()=>{setRoute(location.pathname+'?room='+code);logSystem('Room created. Invite your friends!');broadcast();});
 peer.on('connection',c=>attachGuest(c));
 peer.on('error',err=>{lastError=err.message||'Unable to connect to multiplayer service';toast('Could not create room: '+lastError);if(screen==='loading'){stopNetwork();screen='home';render();}});
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
  pid=seat.id;const previous=conns.get(pid);if(previous&&previous!==c)try{previous.close()}catch{};conns.set(pid,c);c.send({type:'joined',id:pid});broadcast();return;
 }
 if(!pid)return;
 handleAction(pid,m);
});c.on('close',()=>{if(pid&&conns.get(pid)===c){conns.delete(pid);const p=hostRoom?.seats.find(x=>x.id===pid);if(p){p.connected=false;logSystem(p.name+' disconnected. Auto-bot will cover their turns.');broadcast();}}});c.on('error',()=>{});}
function joinOnline(){const name=saveName();const code=String($('#joinCode')?.value||gameCode).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);if(code.length<6){toast('Enter a 6-character room code.');return;}if(!window.Peer){toast('Online library failed to load. Check internet.');return;}
 stopNetwork();gameCode=code;role='guest';isSolo=false;screen='loading';loadingMessage='Joining room '+code+'…';lastError='';render();
 let token=store.getItem('syam7-token-'+code);if(!token||!token.startsWith('p-')){token='p-'+uid();store.setItem('syam7-token-'+code,token);}myId=token;
 peer=new Peer(undefined,{debug:0});
 peer.on('open',()=>{guestConn=peer.connect('7cards-syam-'+code.toLowerCase(),{reliable:true});guestConn.on('open',()=>{clearTimeout(joinTimeout);guestConn.send({type:'join',token,name});});guestConn.on('data',m=>{if(m?.type==='joined'){myId=m.id;setRoute(location.pathname+'?room='+code);return;}if(m?.type==='state'){currentView=m.view;screen='room';render();return;}if(m?.type==='error'){toast(m.message);stopNetwork();screen='join';render();}});guestConn.on('close',()=>{if(role==='guest'){toast('Disconnected from host. Rejoin using the same code.');screen='join';render();}});guestConn.on('error',()=>{toast('Unable to join. Try again.');});});
 peer.on('error',err=>{toast(err.type==='peer-unavailable'?'Room not found. Ask host to open their room.':'Online connection error: '+(err.type||'unknown'));stopNetwork();screen='join';render();});
 joinTimeout=setTimeout(()=>{if(screen==='loading'){toast('Connection timed out. Ensure host has the room open.');stopNetwork();screen='join';render();}},16000);
}
function addBot(){if(!hostRoom||hostRoom.seats.length>=8||hostRoom.phase!=='lobby')return false;const botCount=hostRoom.seats.filter(p=>p.isBot).length;const name=BOT_NAMES[botCount%BOT_NAMES.length];hostRoom.seats.push({id:'bot-'+uid(),name,isBot:true,score:0,connected:true,isHost:false});return true;}
function startRound(){if(!hostRoom||hostRoom.seats.length<2)return;const r=hostRoom;const deck=shuffle(allCards());const hands=Object.fromEntries(r.seats.map(p=>[p.id,[]]));deck.forEach((card,i)=>hands[r.seats[i%r.seats.length].id].push(card));const starterIndex=r.seats.findIndex(p=>hands[p.id].some(c=>c.suit==='H'&&c.rank===7));r.roundIndex++;r.phase='playing';r.lastRound=null;r.game={hands,board:{H:null,D:null,C:null,S:null},turnIndex:starterIndex,turnId:r.seats[starterIndex].id,lastCard:null,lastAction:'7♥ must be played first.'};logSystem('Round '+r.roundIndex+' started! '+r.seats[starterIndex].name+' holds 7♥.');broadcast();}
function completeRound(winner){const r=hostRoom,g=r.game;const points={};for(const p of r.seats){const earned=g.hands[p.id].reduce((n,c)=>n+rankPoints(c),0);p.score+=earned;points[p.id]=earned;}
 r.lastRound={points,winnerName:winner.name,winnerId:winner.id};r.history.push({round:r.roundIndex,points});r.phase=r.roundIndex>=r.targetRounds?'finished':'round_end';logSystem(winner.name+' finished round '+r.roundIndex+'.');if(r.phase==='finished'){const best=Math.min(...r.seats.map(p=>p.score));logSystem('Match over! Winner: '+r.seats.filter(p=>p.score===best).map(p=>p.name).join(' & '));}broadcast();}
function playCard(pid,card){const r=hostRoom,g=r?.game;if(!g||r.phase!=='playing'||turnPlayer(r)?.id!==pid)return;const current=g.hands[pid],pos=current.findIndex(c=>c.suit===card.suit&&c.rank===card.rank);if(pos<0||!legalMoves(current,g.board).some(c=>c.suit===card.suit&&c.rank===card.rank))return;
 current.splice(pos,1);const lane=g.board[card.suit];if(!lane)g.board[card.suit]={lo:7,hi:7};else{lane.lo=Math.min(lane.lo,card.rank);lane.hi=Math.max(lane.hi,card.rank);}
 const p=r.seats.find(x=>x.id===pid);g.lastCard=card;g.lastAction=p.name+' played '+valueName(card.rank)+SUIT_ICONS[card.suit];if(pid===myId)sound();if(!current.length){completeRound(p);return;}g.turnIndex=(g.turnIndex+1)%r.seats.length;g.turnId=turnPlayer(r).id;broadcast();}
function passTurn(pid){const r=hostRoom,g=r?.game;if(!g||r.phase!=='playing'||turnPlayer(r)?.id!==pid||legalMoves(g.hands[pid],g.board).length)return;const p=r.seats.find(x=>x.id===pid);g.lastAction=p.name+' passed (no playable cards).';g.turnIndex=(g.turnIndex+1)%r.seats.length;g.turnId=turnPlayer(r).id;broadcast();}
function scheduleBot(){clearTimeout(botTimeout);if(!hostRoom||hostRoom.phase!=='playing')return;const p=turnPlayer(hostRoom);if(!p||(!p.isBot&&p.connected))return;botTimeout=setTimeout(()=>{if(!hostRoom||hostRoom.phase!=='playing'||turnPlayer(hostRoom)?.id!==p.id)return;const legal=legalMoves(hostRoom.game.hands[p.id],hostRoom.game.board);if(!legal.length)passTurn(p.id);else {const scored=legal.map(c=>({c,score:c.rank+(c.rank===7?3:0)+Math.random()*5})).sort((a,b)=>b.score-a.score);playCard(p.id,scored[0].c);}},p.isBot?650:4800);}
function handleAction(pid,m){const r=hostRoom;if(!r||!m||typeof m!=='object')return;
 if(m.type==='play'){if(typeof m.card==='string'){const x=/^([HDCS])(1[0-3]|[1-9])$/.exec(m.card);if(x)playCard(pid,{suit:x[1],rank:Number(x[2])});}}else if(m.type==='pass')passTurn(pid);
 else if(m.type==='chat'){const p=r.seats.find(x=>x.id===pid);if(!p)return;const str=String(m.text||'').trim().slice(0,140);if(!str)return;r.chat.push({name:p.name,text:str,system:false});r.chat=r.chat.slice(-80);broadcast();}
}
function hostControl(action,param){if(role!=='host'||!hostRoom)return;const r=hostRoom;
 if(action==='add-bot'){if(addBot()){broadcast();toast('Bot joined your table.');}else toast('Table full or game already started.');}
 else if(action==='remove-player'&&r.phase==='lobby'){const i=r.seats.findIndex(p=>p.id===param&&p.id!==r.owner);if(i<0)return;const [removed]=r.seats.splice(i,1);const c=conns.get(removed.id);if(c){try{c.send({type:'error',message:'The host removed you from the table.'});c.close()}catch{}conns.delete(removed.id);}broadcast();}
 else if(action==='start'){const raw=$('#rounds')?.value;const n=Number(raw);r.targetRounds=Number.isFinite(n)?Math.max(5,Math.min(100,Math.round(n))):5;if(r.phase==='lobby'&&r.seats.length>=2)startRound();}
 else if(action==='next'&&r.phase==='round_end')startRound();
 else if(action==='rematch'&&r.phase==='finished'){for(const p of r.seats)p.score=0;r.roundIndex=0;r.history=[];r.lastRound=null;startRound();}
 else if(action==='rounds'&&r.phase==='lobby'){const n=Number(param);r.targetRounds=Number.isFinite(n)?Math.max(5,Math.min(100,Math.round(n))):5;broadcast();}
}
function inviteUrl(){if(!currentView||isSolo)return '';return location.origin+location.pathname+'?room='+encodeURIComponent(currentView.code);}
async function copyLink(){const url=inviteUrl();if(!url){toast('Invite links are for online rooms only.');return;}try{await navigator.clipboard.writeText(url);toast('Invite link copied! Send it to your friends.');}catch{const box=document.createElement('textarea');box.value=url;document.body.append(box);box.select();document.execCommand('copy');box.remove();toast('Invite link copied: '+url);}}
async function shareLink(){const url=inviteUrl();if(!url)return;if(navigator.share){try{await navigator.share({title:'Play 7Cards Games by Syam',text:'Join my private 7Cards game! 🃏',url});return;}catch{}}copyLink();}
function safeHome(){stopNetwork();setRoute(location.pathname);gameCode='';screen='home';render();}
app.addEventListener('click',async event=>{const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;
 switch(a){
 case 'rules': $('#rulesDialog').showModal();break;
 case 'sound':audioEnabled=!audioEnabled;store.setItem('syam7-sound',audioEnabled?'on':'off');render();toast(audioEnabled?'Sound enabled':'Sound muted');break;
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
 case 'remove-player':hostControl(a,el.dataset.player);break;
 case 'chat':sendChat();break;
 case 'reaction':sendMessage(el.dataset.emoji);break;
 }
});
function sendMessage(text){if(role==='host')handleAction(myId,{type:'chat',text});else if(guestConn?.open)guestConn.send({type:'chat',text});}
function sendChat(){const input=$('#chatInput');if(!input)return;const txt=input.value.trim();if(txt){sendMessage(txt);input.value='';}}
app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='chatInput'){e.preventDefault();sendChat();}if(e.key==='Enter'&&e.target.id==='joinCode')joinOnline();});
app.addEventListener('change',e=>{if(e.target.id==='rounds'&&role==='host')hostControl('rounds',e.target.value);});
$('#rulesClose').addEventListener('click',()=>$('#rulesDialog').close());
$('#rulesDialog').addEventListener('click',e=>{if(e.target.id==='rulesDialog')$('#rulesDialog').close();});
window.Syam7Test={allCards,legalMoves,makeRoom,shuffle,packCard};
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
render();
})();
