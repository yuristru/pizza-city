import assert from 'node:assert/strict';
import {isNight,cityBrightness,nightSkipTarget} from '../pizza-night.js';
for(const [minute,dark]of [[0,true],[6*60+59,true],[7*60,false],[12*60,false],[19*60,false],[20*60,true],[23*60+59,true],[1440,true]])assert.equal(isNight(minute),dark);
for(const [minute,value]of [[0,.45],[7*60,.45],[7.5*60,.725],[8*60,1],[12*60,1],[19*60,1],[19.5*60,.725],[20*60,.45],[23*60,.45]])assert(Math.abs(cityBrightness(minute)-value)<1e-10);
for(let m=0;m<2880;m++){assert(cityBrightness(m)>=.45&&cityBrightness(m)<=1);assert.equal(cityBrightness(m),cityBrightness(m+1440));if(isNight(m)){const target=nightSkipTarget(m);assert(target>m);assert.equal(target%1440,660);assert(target-m<=15*60);}else assert.equal(nightSkipTarget(m),null);}
assert.equal(nightSkipTarget(20*60),1440+660);assert.equal(nightSkipTarget(0),660);assert.equal(nightSkipTarget(1440+4*60),1440+660);
for(const n of [NaN,Infinity,-1,null,undefined])assert.equal(nightSkipTarget(n),null);
console.log('Night rules passed: dusk/dawn, bounded repeatable city darkness, night-only skipping, exact next lunch time and invalid/daytime guards.');
