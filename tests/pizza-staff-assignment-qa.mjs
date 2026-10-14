import assert from 'node:assert/strict';
import {freshStaff,hireEmployee,assignEmployee,assignShift,restoreStaff,restaurantStaff,monthlyPayroll} from '../pizza-staff.js';
import {freshRestaurant} from '../pizza-restaurant-profiles.js';
import {staffSchedule,planningShift} from '../pizza-shifts.js';
const profiles={'via-roma':freshRestaurant('via-roma'),'mamma-mia':freshRestaurant('mamma-mia')},staff=freshStaff(81);
function hire(role,id,shift){const person=staff.market.find(p=>p.role===role),result=hireEmployee(staff,person.id,id,profiles,shift);assert(result.ok,result.issue);return result.employee;}
for(let i=0;i<4;i++)hire('cook','via-roma','lunch');
assert.equal(staffSchedule(staff,'via-roma',18*60,profiles['via-roma'].service).working.length,0);
const evening=hire('cook','via-roma','evening');assert.equal(staffSchedule(staff,'via-roma',18*60,profiles['via-roma'].service).working.length,1,'Four lunch cooks must not block an evening cook.');
for(let i=0;i<3;i++)hire('cook','via-roma','evening');
for(const shift of ['lunch','evening'])for(let i=0;i<4;i++)hire('waiter','via-roma',shift);
for(const role of ['cook','waiter'])for(const shift of ['lunch','evening']){
 const before=structuredClone(staff),candidate=staff.market.find(p=>p.role===role),result=hireEmployee(staff,candidate.id,'via-roma',profiles,shift);
 assert(!result.ok);assert.match(result.issue,new RegExp(shift==='lunch'?'Mittagsschicht':'Abendschicht'));assert.match(result.issue,new RegExp(role==='cook'?'Köche':'Servicekräfte'));assert.deepEqual(staff,before,'A rejected hire must preserve candidates, employees and salaries.');
 assert.equal(restaurantStaff(staff,'via-roma',shift).filter(p=>p.role===role).length,4);
}
assert.equal(profiles['via-roma'].business.cook,8);assert.equal(profiles['via-roma'].business.waiter,8);
assert(staffSchedule(staff,'via-roma',690,profiles['via-roma'].service).accepting);assert(staffSchedule(staff,'via-roma',1080,profiles['via-roma'].service).accepting);
assert.deepEqual(restoreStaff(structuredClone(staff),profiles),staff,'Both full shifts must survive reload without moving valid people into reserve.');
const other=hire('cook','mamma-mia','lunch'),before=structuredClone(other);
assert(!assignEmployee(staff,other.id,'via-roma',profiles).ok);assert.deepEqual(other,before);
const lunch=restaurantStaff(staff,'via-roma','lunch').find(p=>p.role==='cook'),lunchBefore=structuredClone(lunch);
assert(!assignShift(staff,lunch.id,'evening',profiles).ok);assert.deepEqual(lunch,lunchBefore,'Changing shift cannot overfill the destination.');
assert(assignEmployee(staff,evening.id,null,profiles).ok);assert(assignEmployee(staff,other.id,'via-roma',profiles,'evening').ok);assert.equal(other.shift,'evening');assert.equal(other.restaurantId,'via-roma');assert.equal(restaurantStaff(staff,'via-roma','lunch').filter(p=>p.role==='cook').length,4);assert.equal(restaurantStaff(staff,'via-roma','evening').filter(p=>p.role==='cook').length,4);
profiles['via-roma'].service.groups=[{phase:'waiting',work:{stage:0,cookId:other.id}}];const busy=structuredClone(other);
assert(!assignEmployee(staff,other.id,'mamma-mia',profiles).ok);assert(!assignShift(staff,other.id,'lunch',profiles).ok);assert.deepEqual(other,busy);assert(assignEmployee(staff,other.id,'via-roma',profiles).ok,'An unchanged assignment is harmless while working.');profiles['via-roma'].service.groups=[];
assert.deepEqual(restoreStaff(structuredClone(staff),profiles),staff);
const payroll=monthlyPayroll(staff),raw=structuredClone(staff),p=raw.employees.find(e=>e.restaurantId==='via-roma'&&e.role==='cook'&&e.shift==='evening');p.shift='lunch';
const recovered=restoreStaff(raw,profiles);assert.equal(recovered.employees.length,staff.employees.length);assert.equal(monthlyPayroll(recovered),payroll);assert.equal(restaurantStaff(recovered,'via-roma','lunch').filter(e=>e.role==='cook').length,4);assert.equal(restaurantStaff(recovered,'via-roma','evening').filter(e=>e.role==='cook').length,3);assert.equal(recovered.employees.find(e=>e.id===p.id).restaurantId,null,'Only genuine overflow from the same shift goes to reserve.');assert.equal(recovered.employees.find(e=>e.id===p.id).avatarSeed,p.avatarSeed);
for(const [minute,shift]of [[0,'lunch'],[659,'lunch'],[660,'lunch'],[959.9,'lunch'],[960,'evening'],[1019.9,'evening'],[1020,'evening'],[1379.9,'evening'],[1380,'lunch'],[1440,'lunch']])assert.equal(planningShift(minute),shift);
console.log('Staff assignment passed: Via Roma four-lunch-cook reproduction, independent role/restaurant/shift capacities, exact rejection without mutation, full two-shift reload, transfers and shift changes, busy guards, salary/avatar preservation and upcoming hiring shifts.');
