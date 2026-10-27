import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {ObjectId} from 'mongodb';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {passwordHash} from './db.js';
import {ensure,validateWindow,canTransition} from './domain.js';
const digest=t=>createHash('sha256').update(t).digest('hex');
const id=value=>{ensure(typeof value==='string'&&/^[a-f\d]{24}$/i.test(value),400,'Invalid resource ID.');return new ObjectId(value);};
const publicUser=u=>u?{id:u._id.toString(),name:u.name,email:u.email,role:u.role}:null;
const active=['pending','approved','checked_out'];
export function createApp(db,client,{production=false}={}){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);app.use(helmet());app.use(express.json({limit:'16kb'}));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin)ensure(req.headers.origin===`${req.protocol}://${req.get('host')}`,403,'Cross-site requests are not allowed.');next();});
 const authLimit=rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:'draft-8',legacyHeaders:false});
 const rawToken=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8);
 app.use(async(req,res,next)=>{const raw=rawToken(req);if(raw){const s=await db.collection('sessions').findOne({token:digest(raw),expires:{$gt:new Date()}});if(s)req.user=await db.collection('users').findOne({_id:s.user_id});}next();});
 const auth=(req,res,next)=>{ensure(req.user,401,'Please sign in to continue.');next();};
 const staff=(req,res,next)=>{ensure(req.user?.role==='staff',403,'Staff access is required.');next();};
 const session=async(res,userId)=>{const token=randomBytes(32).toString('hex');await db.collection('sessions').insertOne({token:digest(token),user_id:userId,expires:new Date(Date.now()+7*86400000)});res.cookie('session',token,{httpOnly:true,sameSite:'lax',secure:production,maxAge:7*86400000,path:'/'});};
 app.get('/api/health',async(req,res)=>{await db.command({ping:1});res.json({status:'ok'});});
 app.get('/api/me',(req,res)=>res.json({user:publicUser(req.user)}));
 app.post('/api/register',authLimit,async(req,res)=>{
 const {name,email,password}=req.body;ensure(typeof name==='string'&&name.trim().length>=2&&name.length<=80,400,'Name must be 2–80 characters.');ensure(typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),400,'Enter a valid email.');ensure(typeof password==='string'&&password.length>=12&&password.length<=128,400,'Password must be 12–128 characters.');
 const r=await db.collection('users').insertOne({name:name.trim(),email:email.trim().toLowerCase(),password:passwordHash(password),role:'student',version:0});await session(res,r.insertedId);res.status(201).json({ok:true});});
 app.post('/api/login',authLimit,async(req,res)=>{const {email,password}=req.body;ensure(typeof email==='string'&&typeof password==='string'&&password.length<=128,400,'Enter your email and password.');const u=await db.collection('users').findOne({email:email.trim().toLowerCase()});const [salt,hash]=(u?.password||'dummy:'+scryptSync('dummy','dummy',64).toString('hex')).split(':');const valid=timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));ensure(u&&valid,401,'Email or password is incorrect.');await session(res,u._id);res.json({ok:true});});
 app.post('/api/logout',async(req,res)=>{const raw=rawToken(req);if(raw)await db.collection('sessions').deleteOne({token:digest(raw)});res.clearCookie('session',{path:'/'});res.json({ok:true});});
 app.get('/api/equipment',async(req,res)=>res.json((await db.collection('equipment').find({active:true}).sort({name:1}).toArray()).map(e=>({...e,id:e._id.toString()}))));
 app.get('/api/equipment/:id/availability',async(req,res)=>{const equipment_id=id(req.params.id);ensure(await db.collection('equipment').findOne({_id:equipment_id,active:true}),404,'Equipment not found.');res.json(await db.collection('bookings').find({equipment_id,status:{$in:active},end:{$gt:new Date()}},{projection:{_id:0,start:1,end:1}}).sort({start:1}).toArray());});
 app.get('/api/bookings',auth,async(req,res)=>res.json(await db.collection('bookings').aggregate([{$match:req.user.role==='staff'?{}:{user_id:req.user._id}},{$sort:{created:-1}},{$lookup:{from:'equipment',localField:'equipment_id',foreignField:'_id',as:'equipment'}},{$unwind:'$equipment'},{$lookup:{from:'users',localField:'user_id',foreignField:'_id',as:'user'}},{$unwind:'$user'},{$project:{id:{$toString:'$_id'},start:1,end:1,purpose:1,status:1,created:1,equipment_name:'$equipment.name',category:'$equipment.category',icon:'$equipment.icon',location:'$equipment.location',user_name:'$user.name',user_email:'$user.email'}}]).toArray()));
 app.post('/api/bookings',auth,async(req,res)=>{
 const equipment_id=id(req.body.equipment_id);const {purpose}=req.body;const window=validateWindow(req.body.start,req.body.end);const start=new Date(window.start),end=new Date(window.end);ensure(typeof purpose==='string'&&purpose.trim().length>=10&&purpose.length<=500,400,'Describe your purpose in 10–500 characters.');
 const s=client.startSession();let bookingId;try{await s.withTransaction(async()=>{
 // Writing both shared documents serializes concurrent slot and per-user quota decisions.
 ensure((await db.collection('equipment').updateOne({_id:equipment_id,active:true},{$inc:{version:1}},{session:s})).matchedCount,404,'Equipment not found.');
 await db.collection('users').updateOne({_id:req.user._id},{$inc:{version:1}},{session:s});
 ensure(!await db.collection('bookings').findOne({equipment_id,status:{$in:active},start:{$lt:end},end:{$gt:start}},{session:s}),409,'This equipment is already reserved during that time. Choose another slot.');
 ensure(await db.collection('bookings').countDocuments({user_id:req.user._id,status:{$in:active}},{session:s})<3,409,'You can have at most three active reservations.');
 const r=await db.collection('bookings').insertOne({user_id:req.user._id,equipment_id,start,end,purpose:purpose.trim(),status:'pending',created:new Date()},{session:s});bookingId=r.insertedId;await db.collection('activity').insertOne({booking_id:bookingId,actor_id:req.user._id,action:'requested',created:new Date()},{session:s});});}finally{await s.endSession();}res.status(201).json({id:bookingId.toString()});});
 app.post('/api/bookings/:id/:action',auth,async(req,res)=>{
 const bookingId=id(req.params.id),{action}=req.params;const s=client.startSession();try{await s.withTransaction(async()=>{const b=await db.collection('bookings').findOne({_id:bookingId},{session:s});ensure(b,404,'Reservation not found.');ensure(canTransition(b.status,action,req.user.role,b.user_id.equals(req.user._id)),403,'This action is not allowed for the current reservation.');
 await db.collection('equipment').updateOne({_id:b.equipment_id},{$inc:{version:1}},{session:s});
 if(action==='approve')ensure(b.start.getTime()>Date.now(),409,'This reservation has already started. Reject it and request a new time.');
 if(action==='checkout'){ensure(b.start.getTime()<=Date.now()&&b.end.getTime()>Date.now(),409,'Checkout is only allowed during the reservation window.');ensure(!await db.collection('bookings').findOne({equipment_id:b.equipment_id,status:'checked_out'},{session:s}),409,'This item has not been returned yet.');}
 const status={approve:'approved',reject:'rejected',cancel:'cancelled',checkout:'checked_out',return:'returned'}[action];await db.collection('bookings').updateOne({_id:bookingId},{$set:{status}},{session:s});await db.collection('activity').insertOne({booking_id:bookingId,actor_id:req.user._id,action,created:new Date()},{session:s});});}finally{await s.endSession();}res.json({ok:true});});
 app.get('/api/bookings/:id/activity',auth,async(req,res)=>{const b=await db.collection('bookings').findOne({_id:id(req.params.id)});ensure(b,404,'Reservation not found.');ensure(req.user.role==='staff'||b.user_id.equals(req.user._id),403,'You cannot access this reservation.');res.json(await db.collection('activity').aggregate([{$match:{booking_id:b._id}},{$sort:{created:1}},{$lookup:{from:'users',localField:'actor_id',foreignField:'_id',as:'actor'}},{$project:{action:1,created:1,name:{$arrayElemAt:['$actor.name',0]}}}]).toArray());});
 app.get('/api/staff/stats',auth,staff,async(req,res)=>{const rows=await db.collection('bookings').find({}).toArray();res.json({total:rows.length,pending:rows.filter(b=>b.status==='pending').length,checked_out:rows.filter(b=>b.status==='checked_out').length,overdue:rows.filter(b=>b.status==='checked_out'&&b.end<new Date()).length});});
 app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.'}));
 app.use((err,req,res,next)=>{if(err.code===11000)return res.status(409).json({error:'That email is already registered.'});if(!err.status)console.error(err.message);res.status(err.status||500).json({error:err.status?err.message:'Something went wrong. Please try again.'});});return app;
}
