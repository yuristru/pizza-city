import {contactAt,cityNight,skateSchedule} from './pizza-city-contacts.js?v=20261018-brick4';
import {Container,Graphics,Rectangle,iso,label,state} from './pizza-core.js?v=20261018-brick4';
import {citySprite} from './pizza-city-art.js?v=20261018-brick4';
import {guestSprite,personSprite} from './pizza-sprites.js?v=20261018-brick4';
import {skateRamps,rampHeight,skaterPose} from './pizza-city-skate.js?v=20261018-brick4';
const put=(layer,g,x,y)=>{const p=iso(x,y);g.position.set(p.x,p.y);g.zIndex=p.y;layer.addChild(g);return g;};
function fallback(site){
 const g=new Container();
 if(site.type==='phone'){const booth=new Graphics().poly([-10,-41,0,-47,10,-41,10,-2,0,3,-10,-2]).fill(0x365850).stroke({color:0xc5ae75,width:1});booth.poly([-7,-37,0,-40,7,-37,7,-13,0,-10,-7,-13]).fill(0x9fae9c);booth.rect(-3,-33,6,12).fill(0x85503b);g.addChild(booth);}
 else{if(site.type==='bench')g.addChild(new Graphics().poly([-17,-8,-1,-16,17,-7,1,1]).fill(0x967144).poly([-17,-17,-1,-25,17,-16,1,-8]).fill(0xae8450));const person=personSprite(site.type==='bench'?1:2,0);person.scale.set(.36);person.y=site.type==='bench'?-8:0;g.addChild(person);}
 return g;
}
export function drawCityContact(objects,labels,site,open){
 const g=new Container(),art=citySprite('contacts',site.art)||fallback(site);g.addChild(art);g.label=site.type==='bench'?'city-park-bench':'city-contact';g.contactId=site.id;g.contactType=site.type;g.landmarkBlock=site.type==='bench'?site.blockId:null;g.contactBounds={x0:site.x-.35,x1:site.x+.35,y0:site.y-.35,y1:site.y+.35};
 g.eventMode='static';g.cursor='pointer';g.hitArea=new Rectangle(-30,-50,60,60);const tap=()=>{if(!state.cityGesture?.moved)open(site.id);};g.on('pointertap',tap);put(objects,g,site.x,site.y);
 const tag=new Container(),text=label('...',9,'#fff0cb'),bg=new Graphics();text.anchor.set(.5);bg.roundRect(-10,-8,20,16,5).fill(site.type==='phone'?0x345d58:site.type==='skate'?0x93552f:0x4a4945).stroke({color:0xc9b27e,width:1});bg.poly([-5,7,-5,11,0,7]).fill(0xc9b27e);tag.addChild(bg,text);tag.label='city-contact-marker';tag.contactId=site.id;tag.position.set(g.x,g.y-34);tag.zIndex=g.y+60;tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-22,-22,44,44);tag.on('pointertap',tap);labels.addChild(tag);
 tag.contactCaption=site.type==='phone'?'TELEFON':site.type==='skate'?'RAMPENCREW':'SPRECHEN';
 let empty=null;if(site.type==='bench'){empty=citySprite('props',5)||fallback({type:'bench'});empty.label='city-contact-empty-bench';put(objects,empty,site.x,site.y);}
 state.cityContactActors.push({g,tag,site,empty,activity:null});return g;
}
export function drawSkatepark(objects,plan){
 const {x0,x1,y0,y1}=plan,w=x1-x0,d=y1-y0,p=(x,y,z=0)=>{const v=iso(x,y);return [v.x,v.y-z];},g=new Graphics();
 const poly=(points,color)=>g.poly(points.flat()).fill(color);
 poly([p(x0,y0),p(x1,y0),p(x1,y1),p(x0,y1)],0xb6aa8d);poly([p(x0+.1,y0+.1),p(x1-.1,y0+.1),p(x1-.1,y1-.1),p(x0+.1,y1-.1)],0x7e8c86);
 for(let x=x0+.5;x<x1-.2;x+=.6)for(let y=y0+.5;y<y1-.2;y+=.6){const a=p(x,y);g.rect(Math.round(a[0]),Math.round(a[1]),2,1).fill(0x9da69a);}
 g.label='city-skatepark';g.parkBounds={...plan};g.zIndex=(x0+y0)*16-1;objects.addChild(g);
 // Each riding strip is a separate depth slice. A skater on the near half
 // can cover its own surface while still passing behind the front side wall.
 for(const r of skateRamps(plan)){
  const steps=12,slices=8;
  const side=(y,color,front)=>{const wall=new Graphics(),points=[];for(let i=0;i<=steps;i++){const x=r.x0+(r.x1-r.x0)*i/steps;points.push(p(x,y,rampHeight(r,x)));}wall.poly([...points,p(r.x1,y),p(r.x0,y)].flat()).fill(color).stroke({color:0x72583d,width:.6});wall.label='city-skate-ramp-side';wall.zIndex=(r.x1+y)*16+(front?.1:-.1);objects.addChild(wall);};
  side(r.y0,0x826044,false);
  for(let j=0;j<slices;j++){
   const strip=new Graphics(),ya=r.y0+(r.y1-r.y0)*j/slices,yb=r.y0+(r.y1-r.y0)*(j+1)/slices;
   for(let i=0;i<steps;i++){
    const xa=r.x0+(r.x1-r.x0)*i/steps,xb=r.x0+(r.x1-r.x0)*(i+1)/steps,za=rampHeight(r,xa),zb=rampHeight(r,xb);
    strip.poly([p(xa,ya,za),p(xb,ya,zb),p(xb,yb,zb),p(xa,yb,za)].flat()).fill([0xb39b70,0xc3ab7e,0xc9b286][Math.floor(i/4)%3]);
    if(i%3===0)strip.moveTo(...p(xa,ya,za)).lineTo(...p(xa,yb,za)).stroke({color:0x92794f,width:.5});
   }
   strip.label='city-skate-ramp';strip.rampBounds=r;strip.zIndex=(r.x1+yb)*16;objects.addChild(strip);
  }
  side(r.y1,0x9b7850,true);
  const coping=new Graphics(),x=r.high==='left'?r.x0:r.x1;
  coping.moveTo(...p(x,r.y0,r.height)).lineTo(...p(x,r.y1,r.height)).stroke({color:0x5c655c,width:2});coping.label='city-skate-coping';coping.zIndex=(x+r.y1)*16+.2;objects.addChild(coping);
 }
 // Concrete joints, a marked approach and a low perimeter edge leave a real entrance.
 for(let x=x0+.5;x<x1;x+=1)g.moveTo(...p(x,y0+.15)).lineTo(...p(x,y1-.15)).stroke({color:0x74827c,width:.5});
 for(const y of [y0+.13,y1-.13]){g.moveTo(...p(x0+.15,y)).lineTo(...p(x1-.15,y)).stroke({color:0xb8b9a1,width:1});}
 const cx=(x0+x1)/2;g.poly([p(cx-.36,y1),p(cx+.36,y1),p(cx+.36,y1+.6),p(cx-.36,y1+.6)].flat()).fill(0xc9bb98);
 const rail=new Graphics(),a=p(x0+w*.35,y0+d*.19,5),b=p(x0+w*.65,y0+d*.19,5);rail.moveTo(...a).lineTo(...b).stroke({color:0x303e3b,width:2});for(const t of [.1,.9]){const x=x0+w*(.35+.3*t),y=y0+d*.19;rail.moveTo(...p(x,y,5)).lineTo(...p(x,y)).stroke({color:0x4b5248,width:2});}rail.label='city-skate-rail';rail.zIndex=(x0+w*.65+y0+d*.19)*16;objects.addChild(rail);
 const bench=citySprite('props',5);if(bench){bench.label='city-skate-bench';put(objects,bench,(x0+x1)/2,y1+.4);}
 state.citySkaters=[];
 for(let i=0;i<2;i++){const sprite=citySprite('contacts',3)||personSprite(i,0);sprite.scale.set(state.cityArt.contacts?.length ? .63 : .33);sprite.eventMode='none';sprite.label='city-skater';if(i)sprite.tint=0xc6d9c7;objects.addChild(sprite);state.citySkaters.push({g:sprite,plan,index:i});}
}
export function tickCityLife(){
 const night=cityNight(state.gameMinutes);for(const {glow}of state.cityLamps||[])glow.visible=night;
 for(const actor of state.cityContactActors||[]){const {g,tag,site,empty}=actor,current=contactAt(site,state.gameMinutes);g.visible=tag.visible=current.available;if(empty)empty.visible=current.activity==='night';
  if(actor.activity!==current.activity){actor.activity=current.activity;g.removeChildren().forEach(c=>c.destroy());
   if(current.activity==='night'){const person=personSprite(site.art?3:2,0,{seed:'night-'+site.id,shirt:{top:site.art?'#51414d':'#454747',x:'#252b2c',y:'#333c3b'},hair:'#302d27'});person.scale.set(.33);g.addChild(person);}
   else if(current.activity==='seated'){for(let i=0;i<2;i++){const person=guestSprite(i+2,0,true);person.scale.set(.33);person.position.set(i?8:-7,-6);g.addChild(person);}}
   else {const art=citySprite('contacts',site.art)||fallback(site);if(site.type==='skate')art.scale.set(.63);g.addChild(art);}
  }
  const p=iso(current.x,current.y);g.position.set(p.x,p.y);g.zIndex=p.y;g.activity=current.activity;tag.position.set(p.x,p.y-(current.activity==='seated'?29:site.type==='skate'?29:40));tag.zIndex=p.y+60;
  const focused=state.cityFocusedContact===site.id;
  if(actor.markerFocus!==focused||actor.markerZoom!==state.camera.scale.x){
   actor.markerFocus=focused;actor.markerZoom=state.camera.scale.x;const bg=tag.children[0],text=tag.children[1];text.text=focused?tag.contactCaption:'...';const width=focused?Math.max(64,text.width+16):20;
   bg.clear().roundRect(-width/2,-8,width,16,5).fill(site.type==='phone'?0x345d58:site.type==='skate'?0x93552f:0x4a4945).stroke({color:0xc9b27e,width:1}).poly([-5,7,-5,11,0,7]).fill(0xc9b27e);
   const hit=Math.max(28,44/state.camera.scale.x);tag.hitArea=new Rectangle(-Math.max(width,hit)/2,-hit/2,Math.max(width,hit),hit);
  }
 }
 for(const {g,plan,index}of state.citySkaters||[]){
  g.visible=skateSchedule(state.gameMinutes)==='skating';if(!g.visible)continue;
  const phase=((state.gameMinutes/2.6+index*.5)%1+1)%1,pose=skaterPose(plan,phase),p=iso(pose.x,pose.y);
  const art=state.cityArt.contacts?.[pose.z>7?4:3];if(art){g.texture=art.texture;g.anchor.set(art.anchor.x,art.anchor.y);}
  g.position.set(Math.round(p.x),Math.round(p.y-pose.z));g.zIndex=pose.ramp?(pose.ramp.x1+pose.y)*16+.15:p.y+.15;g.ridingPose=pose;g.scale.x=Math.abs(g.scale.x)*pose.dir;

 }
}
