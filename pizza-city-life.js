import {contactAt,cityNight,skateSchedule} from './pizza-city-contacts.js?v=20261017b';
import {Container,Graphics,Rectangle,iso,label,state} from './pizza-core.js?v=20261017b';
import {citySprite} from './pizza-city-art.js?v=20261017b';
import {guestSprite,personSprite} from './pizza-sprites.js?v=20261017b';
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
 const tag=new Container(),text=label(site.type==='phone'?'TELEFON':site.type==='skate'?'RAMPENCREW':'SPRECHEN',8,'#fff0cb'),bg=new Graphics();text.anchor.set(.5);const width=Math.max(64,text.width+16);bg.roundRect(-width/2,-10,width,20,4).fill(site.type==='phone'?0x345d58:site.type==='skate'?0x93552f:0x4a4945).stroke({color:0xc9b27e,width:1});tag.addChild(bg,text);tag.label='city-contact-marker';tag.contactId=site.id;tag.position.set(g.x,g.y-(site.type==='phone'?43:46));tag.zIndex=g.y+60;tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-width/2,-14,width,28);tag.on('pointertap',tap);labels.addChild(tag);
 let empty=null;if(site.type==='bench'){empty=citySprite('props',5)||fallback({type:'bench'});empty.label='city-contact-empty-bench';put(objects,empty,site.x,site.y);}
 state.cityContactActors.push({g,tag,site,empty,activity:null});return g;
}
export function drawSkatepark(objects,plan){
 const {x0,x1,y0,y1}=plan,w=x1-x0,d=y1-y0,p=(x,y,z=0)=>{const v=iso(x,y);return [v.x,v.y-z];},g=new Graphics();
 const poly=(points,color)=>g.poly(points.flat()).fill(color);
 poly([p(x0,y0),p(x1,y0),p(x1,y1),p(x0,y1)],0xb6aa8d);poly([p(x0+.1,y0+.1),p(x1-.1,y0+.1),p(x1-.1,y1-.1),p(x0+.1,y1-.1)],0x7e8c86);
 for(let x=x0+.5;x<x1-.2;x+=.6)for(let y=y0+.5;y<y1-.2;y+=.6){const a=p(x,y);g.rect(Math.round(a[0]),Math.round(a[1]),2,1).fill(0x9da69a);}
 g.label='city-skatepark';g.parkBounds={...plan};g.zIndex=(x0+y0)*16-1;objects.addChild(g);
 function ramp(x,y,reverse=false){
  const r=new Graphics(),px=(a,b,z=0)=>p(x+(reverse?-.75+a:a),y+b,z),heights=reverse?[0,1,5,12]:[12,5,1,0],xs=[0,.25,.5,.75],points=xs.map((a,i)=>px(a,0,heights[i]));
  r.poly([...points,px(.75,0),px(0,0)].flat()).fill(0x855c3d).stroke({color:0x493e30,width:1});
  for(let i=0;i<3;i++)r.poly([px(xs[i],0,heights[i]),px(xs[i+1],0,heights[i+1]),px(xs[i+1],Math.min(1.3,d*.38),heights[i+1]),px(xs[i],Math.min(1.3,d*.38),heights[i])].flat()).fill(i===1?0xb9a078:0xc9af83).stroke({color:0x7e6b4d,width:1});
  r.label='city-skate-ramp';r.zIndex=(x+y+1.3)*16;objects.addChild(r);
 }
 ramp(x0+.2,y0+.2);ramp(x1-.2,y1-Math.min(1.3,d*.38)-.2,true);
 const rail=new Graphics(),a=p(x0+w*.35,y0+d*.5,5),b=p(x0+w*.65,y0+d*.5,5);rail.moveTo(...a).lineTo(...b).stroke({color:0x303e3b,width:2});for(const t of [.1,.9]){const x=x0+w*(.35+.3*t),y=y0+d*.5;rail.moveTo(...p(x,y,5)).lineTo(...p(x,y)).stroke({color:0x4b5248,width:2});}rail.label='city-skate-rail';rail.zIndex=(x0+w*.65+y0+d*.5)*16;objects.addChild(rail);
 const bench=citySprite('props',5);if(bench){bench.label='city-skate-bench';put(objects,bench,(x0+x1)/2,y1-.4);}
 state.citySkaters=[];
 for(let i=0;i<2;i++){const sprite=citySprite('contacts',3)||personSprite(i,0);if(!state.cityArt.contacts)sprite.scale.set(.36);sprite.eventMode='none';sprite.label='city-skater';if(i)sprite.tint=0xc6d9c7;objects.addChild(sprite);state.citySkaters.push({g:sprite,plan,index:i});}
}
export function tickCityLife(){
 const night=cityNight(state.gameMinutes);for(const {glow}of state.cityLamps||[])glow.visible=night;
 for(const actor of state.cityContactActors||[]){const {g,tag,site,empty}=actor,current=contactAt(site,state.gameMinutes);g.visible=tag.visible=current.available;if(empty)empty.visible=current.activity==='night';
  if(actor.activity!==current.activity){actor.activity=current.activity;g.removeChildren().forEach(c=>c.destroy());
   if(current.activity==='night'){const person=personSprite(site.art?3:2,0,{seed:'night-'+site.id,shirt:{top:site.art?'#51414d':'#454747',x:'#252b2c',y:'#333c3b'},hair:'#302d27'});person.scale.set(.4);g.addChild(person);}
   else if(current.activity==='seated'){for(let i=0;i<2;i++){const person=guestSprite(i+2,0,true);person.scale.set(.4);person.position.set(i?8:-7,-6);g.addChild(person);}g.addChild(new Graphics().roundRect(-13,2,25,4,2).fill(0x985c3c).circle(-8,7,2).fill(0x36372f).circle(8,7,2).fill(0x36372f));}
   else g.addChild(citySprite('contacts',site.art)||fallback(site));
  }
  const p=iso(current.x,current.y);g.position.set(p.x,p.y);g.zIndex=p.y;g.activity=current.activity;tag.position.set(p.x,p.y-(current.activity==='seated'?30:46));tag.zIndex=p.y+60;
 }
 for(const {g,plan,index}of state.citySkaters||[]){
  g.visible=skateSchedule(state.gameMinutes)==='skating';if(!g.visible)continue;
  const {x0,x1,y0,y1}=plan,phase=((state.gameMinutes/1.8+index*.43)%1+1)%1,edge=Math.floor(phase*4),t=phase*4-edge,points=[[x0+.6,y0+.6],[x1-.6,y0+.6],[x1-.6,y1-.6],[x0+.6,y1-.6]],a=points[edge],b=points[(edge+1)%4],p=iso(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);
  const art=state.cityArt.contacts?.[t>.8?5:t>.62?4:3];if(art)g.texture=art.texture;
  g.position.set(Math.round(p.x),Math.round(p.y));g.zIndex=p.y;g.scale.x=Math.abs(g.scale.x)*((b[0]-a[0])-(b[1]-a[1])<0?-1:1);
 }
}
