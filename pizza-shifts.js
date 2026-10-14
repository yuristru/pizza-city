export const SHIFTS={lunch:{name:'Mittag',start:11*60,end:16*60},evening:{name:'Abend',start:17*60,end:23*60}};
const clock=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export function shiftLabel(id){const s=SHIFTS[id]||SHIFTS.lunch;return s.name+' · '+clock(s.start)+' bis '+clock(s.end)+' Uhr';}
export function shiftAt(minutes){const n=minutes%1440;return Object.keys(SHIFTS).find(id=>n>=SHIFTS[id].start&&n<SHIFTS[id].end)||null;}
export function planningShift(minutes){const active=shiftAt(minutes);if(active)return active;const n=minutes%1440;return Object.keys(SHIFTS).find(id=>SHIFTS[id].start>n)||'lunch';}
export function nextShiftBoundary(minutes){const base=Math.floor(minutes/1440)*1440;return [...Object.values(SHIFTS).flatMap(s=>[s.start,s.end]),1440].map(n=>base+n).find(n=>n>minutes+1e-8)||base+1440;}
export function staffSchedule(staff,id,minutes,service){
 const team=staff.employees.filter(p=>p.restaurantId===id),active=shiftAt(minutes),n=minutes%1440;
 const previous=!active?(n>=16*60&&n<17*60?'lunch':'evening'):null;
 const pending=!!(service.groups.length||service.waiterTasks?.length||service.dirtyTables?.length);
 const scheduled=team.filter(p=>(p.shift||'lunch')===active),working=active?scheduled:pending?team.filter(p=>(p.shift||'lunch')===previous):[];
 return {active,scheduled,working,closing:!active&&working.length>0,accepting:scheduled.some(p=>p.role==='cook')&&scheduled.some(p=>p.role==='waiter')};
}
