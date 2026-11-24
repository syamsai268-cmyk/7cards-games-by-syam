// 7Cards Games v1.5.0: zero-dependency CI checks. Run: node scripts/check-release.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required=['index.html','app.js','styles.css','sw.js','manifest.webmanifest','render.yaml','favicon.svg'];
for(const file of required)assert.ok(existsSync(resolve(root,file)),`Missing ${file}`);
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'styles.css'),'utf8');
const code=readFileSync(resolve(root,'app.js'),'utf8');
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
assert.match(html,/7Cards Games v1\.5\.0/);
assert.match(html,/styles\.css\?v=1\.5\.0/);
assert.match(html,/app\.js\?v=1\.5\.0/);
assert.match(css,/\.suit-name\.suit-H/);
assert.match(css,/\.suit-name\.suit-D/);
assert.match(css,/\.suit-name\.suit-C/);
assert.match(css,/\.suit-name\.suit-S/);
assert.match(css,/\.voice-anchor/);
assert.match(code,/getUserMedia/);
assert.match(code,/peer\.call\(/);
assert.match(code,/call\.answer\(voiceStream\)/);
assert.match(sw,/7cards-syam-v1\.5\.0/);

// Execute the actual game JavaScript with a small browser DOM stub and test its exported rules.
const eventTarget=()=>({innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},showModal(){},close(){},scrollTop:0});
const app=eventTarget();
const eventHandlers={};
app.addEventListener=(name,callback)=>{eventHandlers[name]=callback;};
const fakeDOM={'#app':app,'#toast':eventTarget(),'#rulesClose':eventTarget(),'#rulesDialog':eventTarget()};
const document={querySelector:(q)=>fakeDOM[q]||null,addEventListener(){},getElementById:()=>null};
const stored=new Map();
const storage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
const location={search:'',protocol:'file:',pathname:'/index.html',origin:'file://'};
const window={localStorage:storage,location};
const env={window,document,navigator:{},location,history:{replaceState(){}},console,URLSearchParams,Math,Date,Map,Set,String,Number,Array,JSON,parseInt,setTimeout,clearTimeout};
const context=createContext(env);context.globalThis=context;
runInContext(code,context,{filename:'app.js',timeout:3000});
const {allCards,legalMoves,packCard,makeRoom}=window.Syam7Test;
const deck=allCards();
assert.equal(deck.length,52,'52 cards must be present');
assert.equal(new Set(deck.map(packCard)).size,52,'Each card unique');
const fresh={H:null,D:null,C:null,S:null};
assert.deepEqual([...legalMoves(deck,fresh)].map(packCard),['H7'],'Only the heart 7 may start');
const first={...fresh,H:{lo:7,hi:7}};
assert.deepEqual([...legalMoves(deck,first)].map(packCard).sort(),['C7','D7','H6','H8','S7'].sort(),'Legal sequences must extend from sevens');
const room=makeRoom('ABC123',false,'Syam');
assert.equal(room.seats[0].name,'Syam');
assert.equal(room.targetRounds,undefined,'Unlimited rounds');
assert.match(app.innerHTML,/CREATED BY SYAM/);
// Verify the real solo-game UI reaches the in-game 52-slot board.
const click = action => eventHandlers.click({target:{closest:()=>({dataset:{action}})}});
click('solo');
assert.match(app.innerHTML,/Play with bots/);
click('start');
assert.match(app.innerHTML,/Round 1/);
assert.equal((app.innerHTML.match(/class="boardcard /g)||[]).length,52);
assert.match(app.innerHTML,/class="suit-name suit-H"/);
assert.match(app.innerHTML,/class="suit-name suit-D"/);
assert.match(app.innerHTML,/class="suit-name suit-C"/);
assert.match(app.innerHTML,/class="suit-name suit-S"/);

console.log('✓ v1.5.0: file structure, stylesheet, voice controls, SW version, game rules and author verified');

// Regression: first-child selector must not hide the wrapped Voice button on phones.
assert.doesNotMatch(css,/\.top-actions \.pill:first-child\{display:none\}/);
assert.match(css,/\.top-actions > \.pill\[data-action="rules"\]\{display:none\}/);
assert.match(css,/\.topbar \.top-actions \.voice-trigger/);

assert.match(code,/const RELAY_URL = 'wss:\/\//,'Hosted WebSocket room relay must be used');
assert.match(code,/new WebSocket\(RELAY_URL\)/,'Host and guest must use relay');
assert.doesNotMatch(code,/peer\.connect\(/,'No WebRTC game data-channel dependency');
