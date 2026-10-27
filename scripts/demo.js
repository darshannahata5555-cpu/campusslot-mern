// Convenience local demo: actual MongoDB, bound to loopback, no Atlas credentials.
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import express from 'express';
import {connectDatabase,seedDemo} from '../server/db.js';
import {createApp} from '../server/app.js';
const dbPath=resolve('data/local-demo');mkdirSync(dbPath,{recursive:true});
const repl=await MongoMemoryReplSet.create({binary:{version:'8.0.16'},instanceOpts:[{dbPath,ip:'127.0.0.1'}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
const {db,client}=await connectDatabase(repl.getUri());await seedDemo(db);const app=createApp(db,client);app.use(express.static('dist'));app.get('/{*path}',(req,res)=>res.sendFile(resolve('dist/index.html')));
const server=app.listen(3000,'127.0.0.1',()=>console.log('Local demo: http://localhost:3000\nStudent: student@campusslot.demo\nStaff: staff@campusslot.demo\nDemo password: CampusDemo123!\nUses a real local MongoDB replica set. Do not expose this demo publicly.'));
let stopping=false;async function stop(){if(stopping)return;stopping=true;server.close();await client.close();await repl.stop({doCleanup:false,force:false});process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);
