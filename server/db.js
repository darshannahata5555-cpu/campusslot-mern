import {MongoClient} from 'mongodb';
import {randomBytes,scryptSync} from 'node:crypto';
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export const equipmentSeed=[
 ['Sony Alpha A6400','Photography','Mirrorless camera with 16–50mm lens, battery and carry case.','Media Lab · Block A','camera'],
 ['Epson EB-X49','Presentation','Bright 3,600 lumen projector with HDMI cable and remote.','Library · Desk 2','projector'],
 ['RØDE Wireless GO II','Audio','Dual wireless microphone kit for interviews and campus films.','Media Lab · Block A','mic'],
 ['Arduino Starter Kit','Electronics','Uno board, breadboard, sensors and components for prototyping.','Innovation Lab · Block C','chip'],
 ['Wacom Intuos','Design','Pressure-sensitive drawing tablet with pen and USB cable.','Design Studio · Block B','pen'],
 ['Manfrotto Tripod','Photography','Stable adjustable tripod with quick-release camera mount.','Media Lab · Block A','tripod']
];
export async function connectDatabase(uri){
 if(!uri)throw new Error('MONGODB_URI is required. See README for Atlas or local replica-set setup.');
 const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});await client.connect();const db=client.db(process.env.MONGODB_DB||'campusslot');
 await Promise.all([db.collection('users').createIndex({email:1},{unique:true}),db.collection('sessions').createIndex({token:1},{unique:true}),db.collection('sessions').createIndex({expires:1},{expireAfterSeconds:0}),db.collection('bookings').createIndex({equipment_id:1,status:1,start:1,end:1}),db.collection('activity').createIndex({booking_id:1,created:1})]);
 for(const [name,category,description,location,icon] of equipmentSeed)await db.collection('equipment').updateOne({name},{$setOnInsert:{name,category,description,location,icon,active:true,version:0}},{upsert:true});
 return {client,db};
}
export async function seedDemo(db){for(const [name,email,role] of [['Alex Morgan','student@campusslot.demo','student'],['Sam Rivera','staff@campusslot.demo','staff']])await db.collection('users').updateOne({email},{$setOnInsert:{name,email,role,password:passwordHash('CampusDemo123!')}},{upsert:true});}
