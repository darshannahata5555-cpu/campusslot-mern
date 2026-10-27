// Verify the real deployed app; --write creates one clearly labeled QA account and cancels its reservation.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base=(process.argv[2]||'').replace(/\/$/,'');
if(!/^https:\/\//.test(base))throw new Error('Usage: node scripts/smoke.js https://your-app.example [--write]');
let cookie;
async function request(path,method='GET',body){
 const res=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});
 const data=await res.json();assert.ok(res.ok,`${method} ${path} failed: ${res.status} ${data.error||''}`);
 const setCookie=res.headers.get('set-cookie');if(setCookie&&!setCookie.startsWith('session=;')){assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/Secure/i);cookie=setCookie.split(';')[0];}return data;
}
assert.equal((await request('/health')).status,'ok');const equipment=await request('/equipment');assert.ok(equipment.length>0);assert.equal((await request('/me')).user,null);console.log(`PASS: health, public catalog (${equipment.length} resources), anonymous session`);
if(process.argv.includes('--write')){
 const marker=randomBytes(6).toString('hex');await request('/register','POST',{name:'Deployment QA',email:`qa-${marker}@campusslot.example`,password:randomBytes(24).toString('base64url')});assert.equal((await request('/me')).user.role,'student');
 const start=new Date(Date.now()+14*86400000),end=new Date(start.getTime()+3600000);
 const b=await request('/bookings','POST',{equipment_id:equipment[0].id,start,end,purpose:'Deployment verification reservation; cancelled immediately.'});
 assert.ok((await request('/bookings')).some(x=>x.id===b.id&&x.status==='pending'));
 await request(`/bookings/${b.id}/cancel`,'POST',{});assert.ok((await request('/bookings')).some(x=>x.id===b.id&&x.status==='cancelled'));
 assert.deepEqual((await request(`/bookings/${b.id}/activity`)).map(x=>x.action),['requested','cancel']);
 await request('/logout','POST',{});cookie=undefined;assert.equal((await request('/me')).user,null);
 console.log('PASS: registration, secure session, persistent reservation, cancellation, history, logout');
}
