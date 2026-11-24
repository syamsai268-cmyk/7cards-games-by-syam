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
    let message=recv(host,'created');
    host.send(JSON.stringify({type:'create',code:'ABC123'}));
    assert.equal((await message).code,'ABC123');
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
    const gone=recv(guest,'error');
    host.close();
    assert.equal((await gone).code,'HOST_LEFT');
  } finally {
    try{host.terminate()}catch{} try{guest.terminate()}catch{}
    for(const c of wss.clients)c.terminate();
    await new Promise(resolve=>server.close(resolve));
  }
});
