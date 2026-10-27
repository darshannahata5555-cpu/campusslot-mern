export class AppError extends Error { constructor(status,message){super(message);this.status=status;} }
export function ensure(condition,status,message){if(!condition)throw new AppError(status,message);}
export function validateWindow(start,end,now=Date.now()){
 const s=Date.parse(start),e=Date.parse(end);
 ensure(Number.isFinite(s)&&Number.isFinite(e),400,'Enter valid start and end dates.');
 ensure(s>now,400,'The reservation must start in the future.');
 ensure(e>s,400,'Return time must be after pickup time.');
 ensure(e-s<=7*86400000,400,'Reservations can last at most seven days.');
 ensure(s-now<=90*86400000,400,'Book within the next 90 days.');
 return {start:new Date(s).toISOString(),end:new Date(e).toISOString()};
}
export function canTransition(status,action,role,owner){
 if(action==='cancel')return owner&&['pending','approved'].includes(status);
 if(role!=='staff')return false;
 return ({approve:'pending',reject:'pending',checkout:'approved',return:'checked_out'})[action]===status;
}
