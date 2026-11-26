'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const WebSocket = require('ws');
const {server, wss} = require('../relay-server');
const listen = async () => {
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  return 'ws://127.0.0.1:'+server.address().port+'/ws';
};
const recv = (ws, type) => new Promise((resolve,reject) => {
  const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('Timed out waiting for '+type));},3000);
  function handler(raw){const msg=JSON.parse(raw.toString()); if(msg.type===type){clearTimeout(timer);ws.off('message',handler);resolve(msg);}}
  ws.on('message',handler);
});
test('Two players join one room, exchange cards and detect host leaving', async () => {
  const url=await listen(), host=new WebSocket(url), guest=new WebSocket(url);
  await Promise.all([once(host,'open'),once(guest,'open')]);
  try {
    // A room can check relay health even before it has registered.
    let health=recv(host,'pong');
    const sent=Date.now();
    host.send(JSON.stringify({type:'ping',sent}));
    const reply=await health;
    assert.equal(reply.sent,sent);
    assert.ok(Number.isFinite(reply.serverAt));

    let message=recv(host,'created');
    host.send(JSON.stringify({type:'create',code:'ABC123'}));
    assert.equal((await message).code,'ABC123');
    // Private rooms must never appear in public discovery.
    let publicList=recv(guest,'public-rooms');
    guest.send(JSON.stringify({type:'public-list'}));
    assert.deepEqual((await publicList).rooms,[]);
    let published=recv(host,'published');
    host.send(JSON.stringify({type:'publish',public:true,phase:'lobby',hostName:'Syam'}));
    assert.equal((await published).public,true);
    publicList=recv(guest,'public-rooms');
    guest.send(JSON.stringify({type:'public-list'}));
    const openList=(await publicList).rooms;
    assert.equal(openList.length,1);
    assert.equal(openList[0].code,'ABC123');
    assert.equal(openList[0].hostName,'Syam');
    published=recv(host,'published');
    host.send(JSON.stringify({type:'publish',public:true,phase:'playing',hostName:'Syam'}));
    assert.equal((await published).public,false);
    publicList=recv(guest,'public-rooms');
    guest.send(JSON.stringify({type:'public-list'}));
    assert.deepEqual((await publicList).rooms,[]);
    published=recv(host,'published');
    host.send(JSON.stringify({type:'publish',public:true,phase:'lobby',hostName:'Syam'}));
    assert.equal((await published).public,true);
    message=recv(host,'guest-open');
    guest.send(JSON.stringify({type:'join',code:'ABC123'}));
    const {channel}=await message;
    const joined=recv(guest,'connected');
    host.send(JSON.stringify({type:'guest-ready',channel}));
    await joined;
    const hostGot=recv(host,'data');
    guest.send(JSON.stringify({type:'relay',data:{type:'join',token:'p-12345678901234567890',name:'Friend'}}));
    assert.equal((await hostGot).data.name,'Friend');
    const guestGot=recv(guest,'data');
    host.send(JSON.stringify({type:'relay',channel,data:{type:'joined',id:'p-12345678901234567890'}}));
    assert.equal((await guestGot).data.type,'joined');
    // Voice travels in both directions via the same room connection.
    // One audio packet is ephemeral and is never stored as a recording.
    const sample=Buffer.alloc(320,140).toString('base64');
    let voice=recv(host,'voice-audio');
    guest.send(JSON.stringify({type:'voice-audio',audio:sample}));
    const toHost=await voice;
    assert.equal(toHost.audio,sample);
    assert.equal(toHost.from,channel);
    voice=recv(guest,'voice-audio');
    host.send(JSON.stringify({type:'voice-audio',audio:sample}));
    const toGuest=await voice;
    assert.equal(toGuest.audio,sample);
    assert.equal(toGuest.from,'host');
    const gone=recv(guest,'error');
    host.close();
    assert.equal((await gone).code,'HOST_LEFT');
  } finally {
    try{host.terminate()}catch{} try{guest.terminate()}catch{}
    for(const c of wss.clients)c.terminate();
    await new Promise(resolve=>server.close(resolve));
  }
});
