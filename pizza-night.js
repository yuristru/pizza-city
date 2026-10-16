import {DAY_MINUTES} from './pizza-daily.js?v=20261016g';
import {SHIFTS} from './pizza-shifts.js?v=20261016g';
const minute=minutes=>((minutes%DAY_MINUTES)+DAY_MINUTES)%DAY_MINUTES;
export function isNight(minutes){const n=minute(minutes);return n>=20*60||n<7*60;}
export function cityBrightness(minutes){
  const n=minute(minutes);if(isNight(minutes))return .45;
  if(n>=19*60)return 1-.55*(n-19*60)/60;
  if(n<8*60)return .45+.55*(n-7*60)/60;
  return 1;
}
export function nightSkipTarget(minutes){
  if(!Number.isFinite(minutes)||minutes<0||!isNight(minutes))return null;
  const day=Math.floor(minutes/DAY_MINUTES)+(minute(minutes)>=20*60?1:0);
  return day*DAY_MINUTES+SHIFTS.lunch.start;
}
