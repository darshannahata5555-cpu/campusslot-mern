import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWindow,canTransition} from '../server/domain.js';
test('booking windows validate boundaries and normalize dates',()=>{
 const now=Date.parse('2026-10-01T00:00:00Z');
 assert.equal(validateWindow('2026-10-02T10:00:00+05:30','2026-10-02T11:00:00+05:30',now).start,'2026-10-02T04:30:00.000Z');
 for(const [s,e] of [['bad','bad'],['2026-09-01','2026-09-02'],['2026-10-02','2026-10-01'],['2026-10-02','2026-10-10'],['2027-02-01','2027-02-02']])assert.throws(()=>validateWindow(s,e,now));
});
test('authorization and booking lifecycle reject invalid transitions',()=>{
 assert.equal(canTransition('pending','approve','student',true),false);
 assert.equal(canTransition('pending','approve','staff',false),true);
 assert.equal(canTransition('approved','checkout','staff',false),true);
 assert.equal(canTransition('checked_out','return','staff',false),true);
 assert.equal(canTransition('pending','cancel','student',false),false);
 assert.equal(canTransition('pending','cancel','student',true),true);
 assert.equal(canTransition('returned','checkout','staff',false),false);
 assert.equal(canTransition('checked_out','cancel','student',true),false);
});
