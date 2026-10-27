import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {connectDatabase,passwordHash} from '../server/db.js';
import {createApp} from '../server/app.js';
test('real MongoDB: identity, concurrent booking conflicts, quota, ownership and checkout lifecycle', {timeout:900000}, async()=>{
 const repl=await MongoMemoryReplSet.create({replSet:{count:1},binary:{version:'8.0.16'}});
 let client,server;
 try{
 const connected=await connectDatabase(repl.getUri());client=connected.client;const {db}=connected;
 server=createApp(db,client).listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
 async function request(path,method='GET',body,cookie){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const student=await request('/register','POST',{name:'Darshan',email:'darshan@example.com',password:'VeryStrongPass123!'});assert.equal(student.status,201);const cookie=student.cookie;
 assert.equal((await request('/register','POST',{name:'Darshan',email:'darshan@example.com',password:'VeryStrongPass123!'})).status,409);
 assert.equal((await request('/login','POST',{email:{$ne:null},password:'anything'})).status,400);
 const other=await request('/register','POST',{name:'Other Student',email:'other@example.com',password:'VeryStrongPass123!'});
 await db.collection('users').insertOne({name:'Coordinator',email:'staff@example.com',password:passwordHash('StaffStrong123!'),role:'staff'});
 const staff=await request('/login','POST',{email:'staff@example.com',password:'StaffStrong123!'});
 const items=(await request('/equipment')).data;const start=new Date(Date.now()+3600000),end=new Date(Date.now()+7200000);const payload={equipment_id:items[0].id,start,end,purpose:'Recording a campus documentary'};
 assert.equal((await request('/bookings','POST',payload)).status,401);
 const simultaneous=await Promise.all([request('/bookings','POST',payload,cookie),request('/bookings','POST',payload,other.cookie)]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[201,409]);
 const winner=simultaneous.findIndex(r=>r.status===201),owner=winner===0?cookie:other.cookie,outsider=winner===0?other.cookie:cookie,bookingId=simultaneous[winner].data.id;
 assert.equal((await request(`/bookings/${bookingId}/approve`,'POST',{},owner)).status,403);
 assert.equal((await request(`/bookings/${bookingId}/activity`,'GET',null,outsider)).status,403);
 assert.equal((await request(`/bookings/${bookingId}/approve`,'POST',{},staff.cookie)).status,200);
 assert.equal((await request(`/bookings/${bookingId}/checkout`,'POST',{},staff.cookie)).status,409);
 // Move the approved fixture into its live time window without waiting an hour.
 const {ObjectId}=await import('mongodb');await db.collection('bookings').updateOne({_id:new ObjectId(bookingId)},{$set:{start:new Date(Date.now()-60000)}});
 assert.equal((await request(`/bookings/${bookingId}/checkout`,'POST',{},staff.cookie)).status,200);
 assert.equal((await request(`/bookings/${bookingId}/cancel`,'POST',{},owner)).status,403);
 assert.equal((await request(`/bookings/${bookingId}/return`,'POST',{},staff.cookie)).status,200);
 assert.equal((await request(`/bookings/${bookingId}/return`,'POST',{},staff.cookie)).status,403);
 const events=await request(`/bookings/${bookingId}/activity`,'GET',null,owner);assert.deepEqual(events.data.map(e=>e.action),['requested','approve','checkout','return']);
 // Adjacent windows are allowed; overlap is blocked. Per-user quota is global across equipment.
 const first=await request('/bookings','POST',payload,owner);assert.equal(first.status,201);
 const adjacent=await request('/bookings','POST',{...payload,start:end,end:new Date(end.getTime()+3600000)},owner);assert.equal(adjacent.status,201);
 assert.equal((await request('/bookings','POST',{...payload,equipment_id:items[1].id},owner)).status,201);
 assert.equal((await request('/bookings','POST',{...payload,equipment_id:items[2].id},owner)).status,409);
 assert.equal((await request(`/bookings/${first.data.id}/cancel`,'POST',{},owner)).status,200);
 assert.equal((await request('/bookings','POST',payload,outsider)).status,201);
 const privacy=await request(`/equipment/${items[0].id}/availability`);assert.ok(privacy.data.every(s=>!s.user_id&&!s.purpose));
 assert.equal((await request('/staff/stats','GET',null,owner)).status,403);
 assert.equal((await request('/bookings/not-an-id/activity','GET',null,owner)).status,400);
 const csrf=await fetch(base+'/logout',{method:'POST',headers:{Origin:'https://attacker.example',Cookie:owner}});assert.equal(csrf.status,403);
 assert.equal((await request('/logout','POST',{},owner)).status,200);assert.equal((await request('/bookings','GET',null,owner)).status,401);
 }finally{if(server)await new Promise(r=>server.close(r));if(client)await client.close();await repl.stop();}
});
