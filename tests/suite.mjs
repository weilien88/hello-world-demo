import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const root=new URL('../',import.meta.url);
await test('Hello Desk desktop and mobile',async()=>{
 const server=createServer(async(req,res)=>{try{res.setHeader('content-type','text/html; charset=utf-8');res.end(await readFile(new URL('index.html',root)))}catch{res.writeHead(500).end()}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const profile=await mkdtemp(new URL('../.chrome-test-',import.meta.url).pathname);
 const chrome=spawn('/usr/bin/google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let socket;const errors=[];
 try{
 const endpoint=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(new Error('Chrome startup timeout: '+log)),15000);chrome.on('error',e=>{clearTimeout(timer);reject(e)});chrome.on('exit',code=>{clearTimeout(timer);reject(new Error('Chrome exited '+code+': '+log))});chrome.stderr.on('data',chunk=>{log+=chunk;const match=log.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1])}})});
 socket=new WebSocket(endpoint);await once(socket,'open');let seq=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params)});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}))});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});const c=(method,params)=>send(method,params,sessionId);
 await c('Runtime.enable');await c('Page.enable');
 const evaluate=async expression=>{const r=await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 const check=async expression=>assert.equal(await evaluate(expression),true,expression);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const navigate=async()=>{await c('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete' && !!document.getElementById('wave')"))return;await new Promise(r=>setTimeout(r,30))}throw new Error('Page load timed out')};
 await mkdir(new URL('test-results/',root),{recursive:true});
 for(const [name,width,height] of [['desktop',1280,800],['mobile',390,844]]){
 await c('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await navigate();await evaluate('localStorage.clear()');await navigate();
 await check("document.getElementById('name-empty').hidden===false && document.getElementById('greeting').textContent==='Hello, world' && document.getElementById('waves').children.length===0 && !document.getElementById('wave-empty').hidden");
 await evaluate("document.getElementById('name').value='Ada';document.getElementById('name').dispatchEvent(new Event('input',{bubbles:true}))");await check("document.getElementById('greeting').textContent==='Hello, Ada'");await navigate();await check("document.getElementById('greeting').textContent==='Hello, Ada'");
 const shot=await c('Page.captureScreenshot',{format:'png'});await writeFile(new URL('test-results/'+name+'.png',root),Buffer.from(shot.data,'base64'));
 await click('#clear-name');await check("!document.getElementById('name-empty').hidden");await click('[data-lang="ar"]');await check("document.documentElement.dir==='rtl' && document.getElementById('greeting').textContent==='مرحبًا بالعالم'");await click('[data-lang="en"]');
 for(const theme of ['ink','paper','lagoon']){await click('button[data-theme="'+theme+'"]');await check(`document.documentElement.dataset.theme==='${theme}'`);if(theme!=='lagoon')await check(`(()=>{const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});const lum=s=>rgb(s).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const bg=lum(getComputedStyle(document.body).backgroundColor);return [document.body,document.getElementById('greeting')].every(el=>{const fg=lum(getComputedStyle(el).color);return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)>=7})})()`)}
 await click('#wave');await evaluate("document.getElementById('wave').focus()");await c('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await c('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await check("document.getElementById('wave-count').textContent==='2' && document.getElementById('waves').children.length===2");
 await c('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('#wave');await check("getComputedStyle(document.getElementById('arc')).transitionDuration==='0s'");await check('document.documentElement.scrollWidth<=innerWidth');
 }
 assert.deepEqual(errors,[]);console.log('SUITE_OK');
 }finally{if(socket)socket.close();chrome.kill();await new Promise(resolve=>{if(chrome.exitCode!==null)resolve();else{chrome.once('exit',resolve);setTimeout(resolve,2000)}});await new Promise(resolve=>server.close(resolve));await rm(profile,{recursive:true,force:true})}
});
