import {staffHash} from './pizza-staff.js?v=20261012c';
const SKIN=[['#f1c39a','#c8906b','#e2ab7c'],['#e6b087','#b77c54','#d49b6e'],['#ca9165','#9b653f','#ba8056'],['#ab7650','#704a34','#996744'],['#8d6248','#593d30','#7c553e']];
const HAIR=['#402d23','#66432d','#a46b38','#c39850','#292c32','#8d4e36','#aaa49a'];
const SHIRTS=[['#769593','#486967','#5c807c'],['#b9654c','#78392e','#9a4d3a'],['#738c59','#42583b','#5d754b'],['#62829b','#355770','#4c7089'],['#b58b4c','#795c35','#99763e']];
export function avatarTraits(seed,role){const skin=SKIN[staffHash(seed,1)%SKIN.length],color=SHIRTS[staffHash(seed,3)%SHIRTS.length];return {seed,skin:{top:skin[0],x:skin[1],y:skin[2]},hair:HAIR[staffHash(seed,2)%HAIR.length],shirt:role==='cook'?{top:'#eee8d6',x:'#b2b7aa',y:'#d8d8c5'}:{top:color[0],x:color[1],y:color[2]},style:staffHash(seed,4)%4,glasses:staffHash(seed,5)%4===0,beard:staffHash(seed,6)%4===0,width:12+staffHash(seed,7)%3,eyes:staffHash(seed,8)%3};}
export function drawStaffAvatar(canvas,person){
 canvas.width=40;canvas.height=48;const c=canvas.getContext('2d'),a=avatarTraits(person.avatarSeed,person.role);c.imageSmoothingEnabled=false;
 const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 rect(0,0,40,48,'#e4cfab');rect(3,3,34,42,['#c9d1b7','#d4bfae','#bfd0cd','#d9c79c'][staffHash(a.seed,9)%4]);
 rect(7,35,26,13,a.shirt.x);rect(9,33,22,15,a.shirt.top);rect(18,30,5,7,a.skin.x);rect(18,35,5,4,a.skin.top);
 const x=Math.floor((40-a.width)/2),top=13;rect(x-2,19,2,7,a.skin.x);rect(x+a.width,19,2,7,a.skin.y);rect(x,top,a.width,19,a.skin.top);rect(x,top,2,16,a.skin.x);rect(x+2,30,a.width-4,3,a.skin.y);
 rect(x,top-2,a.width,5,a.hair);rect(x,top+3,2,5,a.hair);rect(x+a.width-2,top+3,2,5,a.hair);
 if(a.style===1)rect(x,top-2,5,9,a.hair);if(a.style===2){rect(x-1,top-3,a.width+2,4,a.hair);rect(x+a.width-2,16,3,13,a.hair);}if(a.style===3)rect(x+2,top-3,a.width-4,2,a.hair);
 const eyesY=21+a.eyes%2;rect(x+3,eyesY,2,2,'#322b28');rect(x+a.width-5,eyesY,2,2,'#322b28');rect(20,23,2,4,a.skin.y);rect(17,29,6,1,'#965a46');
 if(a.beard){rect(x+2,28,a.width-4,4,a.hair);rect(17,29,6,1,a.skin.y);}if(a.glasses){rect(x+1,eyesY-1,6,1,'#51483e');rect(x+a.width-7,eyesY-1,6,1,'#51483e');rect(x+1,eyesY+2,6,1,'#51483e');rect(x+a.width-7,eyesY+2,6,1,'#51483e');rect(19,eyesY,2,1,'#51483e');}
 if(person.role==='cook'){rect(x-2,10,a.width+4,6,'#f3efdf');rect(x,6,a.width,6,'#fcf7e8');rect(x+4,4,a.width-8,3,'#fcf7e8');rect(x-2,14,a.width+4,2,'#c0c6b9');rect(17,38,6,10,'#d5d2c0');rect(18,40,1,1,'#6f7770');rect(18,44,1,1,'#6f7770');}
 else{rect(16,37,9,11,a.shirt.x);rect(19,36,3,4,'#e9dfc5');rect(19,40,3,7,'#463a30');}
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Avatar von '+person.name);
}
