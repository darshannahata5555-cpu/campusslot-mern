import {connectDatabase,seedDemo} from './db.js';
import {createApp} from './app.js';
import express from 'express';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
try{
const {db,client}=await connectDatabase(process.env.MONGODB_URI);if(process.env.SEED_DEMO==='true')await seedDemo(db);
const app=createApp(db,client,{production:process.env.NODE_ENV==='production'});
if(existsSync('dist/index.html')){app.use(express.static('dist'));app.get('/{*path}',(req,res)=>res.sendFile(resolve('dist/index.html')));}
const server=app.listen(process.env.PORT||3000,()=>console.log(`CampusSlot listening on http://localhost:${process.env.PORT||3000}`));
process.on('SIGTERM',()=>server.close(async()=>{await client.close();process.exit(0);}));
}catch(err){console.error('Startup failed:',err.message);process.exit(1);}
