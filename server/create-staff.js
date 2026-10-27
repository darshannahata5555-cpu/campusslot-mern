import {connectDatabase,passwordHash} from './db.js';
const [name,email]=process.argv.slice(2);const password=process.env.STAFF_PASSWORD;
if(!name||!email||!password||password.length<12)throw new Error('Provide name and email arguments and a STAFF_PASSWORD environment variable of at least 12 characters.');
const {db,client}=await connectDatabase(process.env.MONGODB_URI);
try{await db.collection('users').insertOne({name,email:email.trim().toLowerCase(),password:passwordHash(password),role:'staff',version:0});console.log('Staff account created.');}finally{await client.close();}
