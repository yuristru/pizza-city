import {app,world,state,Container,Graphics,Sprite,Texture,iso,label} from './pizza-core.js?v=20261017b';
import {loadCityArt,citySprite} from './pizza-city-art.js?v=20261017b';
import {personSprite} from './pizza-sprites.js?v=20261017b';
import {oldtownQuarter,perimeterCoverage,foundationsOverlap} from './pizza-city-perimeter.js?v=20261017b';

// This page renders a separate study. It never starts the game or writes saves.
app.renderer.background.color=0xe1dec9;
await loadCityArt();
if(state.assetFailures.length)throw new Error('Missing study assets: '+state.assetFailures.join(', '));
const catalog=state.cityArt.buildings.map((a,index)=>({kind:'buildings',index,...a.groundSize}));
const plan=oldtownQuarter(catalog),camera=new Container(),ground=new Container(),objects=new Container(),marks=new Container(),signs=new Container();
objects.sortableChildren=true;camera.addChild(ground,objects,marks,signs);world.addChild(camera);
const root=document.getElementById('app'),courtToggle=document.getElementById('courts');
let mode='closed',view=matchMedia('(max-width:600px)').matches?'alley':'all',selected=null,rendered=[],people=[];
const pointers=new Map();let moved=0,pinchDistance=0;
const point=(x,y)=>{const p=iso(x,y);return[p.x,p.y];};
const at=(layer,object,x,y)=>{const p=iso(x,y);object.position.set(p.x,p.y);object.zIndex=p.y;layer.addChild(object);return object;};
const rect=(layer,b,color,alpha=1)=>{
  const g=new Graphics().poly([point(b.x0,b.y0),point(b.x1,b.y0),point(b.x1,b.y1),point(b.x0,b.y1)].flat()).fill({color,alpha});layer.addChild(g);return g;
};
function groundTexture(){
  const min=-1.5,max=16.5,left=(min-max)*32-32,top=min*32-16;
  const canvas=document.createElement('canvas');canvas.width=(max-min)*64+64;canvas.height=(max-min)*32+32;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const p=(x,y)=>{const a=iso(x,y);return[a.x-left,a.y-top];};
  const poly=(vertices,color)=>{ctx.fillStyle=color;ctx.beginPath();vertices.forEach(([x,y],i)=>i?ctx.lineTo(...p(x,y)):ctx.moveTo(...p(x,y)));ctx.closePath();ctx.fill();};
  const quad=(x,y,w,h,color)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],color);
  for(let y=min;y<15.5;y+=.25)for(let x=min;x<16.5;x+=.25){
    const n=((Math.imul(Math.round(x*4)+53,374761393)^Math.imul(Math.round(y*4)+79,668265263))>>>0);
    const alley=x>6.8&&x<7.9||y>6.2&&y<7.3;
    quad(x,y,.25,.25,alley?'#a69e87':'#b4a88d');
    quad(x+.014,y+.014,.224,.224,(alley?['#b4ad96','#beb59e','#b9b29b']:['#c4b99d','#cfc3a5','#cabfa2','#c0b79c'])[n%(alley?3:4)]);
  }
  // A restrained radial paving motif makes the intentional public square legible.
  const square=plan.piazza,cx=(square.x0+square.x1)/2,cy=(square.y0+square.y1)/2;
  for(const b of plan.blocks){
    const c=b.court;quad(c.x0-.1,c.y0-.1,c.x1-c.x0+.2,c.y1-c.y0+.2,'#c6b893');
    quad(c.x0+.12,c.y0+.12,.8,.65,'#879065');
    for(let y=c.y0;y<c.y1;y+=.35)for(let x=c.x0;x<c.x1;x+=.35)if(x>c.x0+1||y>c.y0+.9)quad(x+.01,y+.01,.32,.32,'#cfc09d');
  }
  ctx.lineWidth=1;
  for(let i=0;i<8;i++){
    const t=i*Math.PI/4;ctx.strokeStyle='#b19e7d';ctx.beginPath();ctx.moveTo(...p(cx,cy));ctx.lineTo(...p(cx+Math.cos(t)*1.9,cy+Math.sin(t)*1.6));ctx.stroke();
  }
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';const sprite=new Sprite(texture);sprite.position.set(left,top);ground.addChild(sprite);
}
groundTexture();
function prop(index,x,y,scale=1){const s=citySprite('props',index);if(s){s.scale.set(scale);at(objects,s,x,y);}return s;}
function sign(part,sprite){
  const tag=new Container(),text=label(part.restaurant,11,'#493426'),bg=new Graphics(),w=text.width+25;
  bg.roundRect(-w/2,-12,w,24,3).fill(0xf2dfba).stroke({color:0x94734d,width:1});
  text.anchor.set(.5);tag.addChild(bg,text);tag.position.set(sprite.x,sprite.y-sprite.height-13);tag.label='oldtown-restaurant-sign';
  tag.eventMode='static';tag.cursor='pointer';tag.on('pointertap',()=>{if(moved<6)select(part);});signs.addChild(tag);
}
function select(part){
  selected=part;
  const box=document.getElementById('selection'),p=document.createElement('p'),b=document.createElement('b');
  b.textContent=part.restaurant+'. ';p.append(b,part.blockId==='piazza'?'Das Café liegt am Rand der eingefassten Piazza. Sein straßenseitiger Eingang bleibt frei erreichbar.':'Der Eingang liegt direkt am Gehweg. Der benachbarte schmale Durchgang führt in den Innenhof.');
  const dot=document.createElement('span');dot.className='dot';box.replaceChildren(dot,p);
  updateMarks();fitView('restaurant');
}
function visibleParts(){
  if(mode==='closed')return plan.parts;
  return plan.parts.filter(p=>{
    if(p.blockId==='piazza')return true;
    if(p.edge==='east'||p.edge==='west')return false;
    if(p.edge==='north')return Number(p.id.split('-').at(-1))%2===0;
    return true;
  });
}
function updateMarks(){
  marks.removeChildren().forEach(c=>c.destroy({children:true}));
  for(const {part,sprite}of rendered){
    const front=part.edge==='south'||part.edge==='east'||['ne','sw','se'].includes(part.corner);
    sprite.alpha=courtToggle.checked&&front?.23:1;
  }
  if(courtToggle.checked)for(const b of plan.blocks){
    rect(marks,b.court,0x598a65,.13).stroke({color:0x789965,width:1});
    const g=b.gate;rect(marks,g,0xd1aa5f,.3);
  }
  if(selected){
    const p=iso(selected.entrance.x,selected.entrance.y),q=iso(selected.approach.x,selected.approach.y);
    marks.addChild(new Graphics().moveTo(p.x,p.y).lineTo(q.x,q.y).stroke({color:0x8a4830,width:3}).circle(q.x,q.y,4).fill(0xffe7af).stroke({color:0x8a4830,width:2}));
  }
  app.render();
}
function rebuild(){
  for(const layer of [objects,marks,signs])layer.removeChildren().forEach(c=>c.destroy({children:true}));
  rendered=[];people=[];
  for(const part of visibleParts()){
    const sprite=citySprite(part.kind,part.index);sprite.scale.set(part.scale);sprite.facadeHeight*=part.scale;
    sprite.label='oldtown-house';sprite.buildingPart=part;
    at(objects,sprite,part.x1,part.y1);rendered.push({part,sprite});
    if(part.restaurant){sprite.eventMode='static';sprite.cursor='pointer';sprite.on('pointertap',()=>{if(moved<6)select(part);});sign(part,sprite);}
  }
  for(const b of plan.blocks){
    const c=b.court;prop(6,c.x0+.48,c.y0+.46,.72);prop(6,c.x1-.45,c.y0+.48,.65);
    prop(5,c.x0+.75,c.y1-.3,.65);
  }
  const s=plan.piazza,cx=(s.x0+s.x1)/2,cy=(s.y0+s.y1)/2;
  prop(4,cx,cy,.76);prop(5,s.x0+.65,s.y1-.65,.8);prop(5,s.x1-.6,s.y0+1,.8);
  for(const [x,y]of [[s.x0+.7,s.y0+.75],[s.x0+1.65,s.y0+.75],[s.x1-.6,s.y1-.65]])prop(7,x,y,.7);
  prop(6,s.x1-.5,s.y0+.3,.85);prop(6,s.x0+.4,s.y1-.4,.85);
  const routes=[{x0:7.35,y0:.3,x1:7.35,y1:6.7},{x0:.4,y0:6.75,x1:14.4,y1:6.75},{x0:8.15,y0:8.65,x1:12.8,y1:8.65},{x0:7.35,y0:8,x1:7.35,y1:13.7}];
  for(let i=0;i<12;i++){
    const route=routes[i%routes.length],sprite=personSprite(i%4,0);sprite.scale.set(.33);sprite.label='oldtown-pedestrian';
    objects.addChild(sprite);people.push({sprite,route,t:(i*.217)%1,dir:i%2?-1:1});
  }
  updatePeople(0);updateMarks();publish();fitView(view);
}
function updatePeople(delta){
  for(const person of people){
    person.t=(person.t+delta*.000018*person.dir+1)%1;const {route,t,sprite}=person;
    const x=route.x0+(route.x1-route.x0)*t,y=route.y0+(route.y1-route.y0)*t,p=iso(x,y);
    sprite.position.set(p.x,p.y);sprite.zIndex=p.y;
  }
}
const targets={all:{x0:-.9,y0:-.9,x1:16,y1:15.1},alley:{x0:4.9,y0:-.1,x1:9.8,y1:7.1},piazza:{x0:6.6,y0:5.6,x1:15.8,y1:15},block:{x0:7.4,y0:-.8,x1:15.5,y1:7.2}};
const viewNames={all:'Das ganze Viertel',alley:'Die schmale Gasse',piazza:'Die eingefasste Piazza',block:'Häuserblock mit Innenhof',restaurant:'Restaurant am Straßenrand'};
function viewStatus(){
  document.getElementById('scaleValue').textContent=Math.round(camera.scale.x*100)+' %';
  if(window.oldtownStudy)window.oldtownStudy.camera={x:camera.x,y:camera.y,zoom:camera.scale.x};
}
function fitView(name){
  view=name;
  const b=name==='restaurant'&&selected?{x0:selected.x0-2.5,y0:selected.y0-2.3,x1:selected.x1+2.5,y1:selected.y1+2}:targets[name]||targets.all;
  const points=[[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].map(([x,y])=>iso(x,y));
  const minX=Math.min(...points.map(p=>p.x))-16,maxX=Math.max(...points.map(p=>p.x))+16;
  const minY=Math.min(...points.map(p=>p.y))-100,maxY=Math.max(...points.map(p=>p.y))+14;
  const scale=Math.min((app.screen.width-24)/(maxX-minX),(app.screen.height-45)/(maxY-minY),1.8);
  camera.scale.set(scale);camera.position.set(app.screen.width/2-(minX+maxX)/2*scale,app.screen.height/2-(minY+maxY)/2*scale);
  document.getElementById('viewName').textContent=viewNames[name]||viewNames.all;
  for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===name));
  viewStatus();app.render();if(window.oldtownStudy)window.oldtownStudy.view=view;
}
function zoom(factor,anchor={x:app.screen.width/2,y:app.screen.height/2}){
  const before=camera.scale.x,scale=Math.max(.25,Math.min(2.8,before*factor));
  const x=(anchor.x-camera.x)/before,y=(anchor.y-camera.y)/before;
  camera.scale.set(scale);camera.position.set(anchor.x-x*scale,anchor.y-y*scale);viewStatus();app.render();
}
function publish(){
  const parts=rendered.map(({part,sprite})=>({...part,storeys:sprite.storeys,facadeHeight:sprite.facadeHeight}));
  const coverage=plan.blocks.map(b=>({id:b.id,edges:perimeterCoverage(b,parts.filter(p=>p.blockId===b.id)),court:b.court,gate:b.gate}));
  const edges=coverage.flatMap(b=>Object.values(b.edges)),ratio=edges.reduce((n,e)=>n+e.built,0)/edges.reduce((n,e)=>n+e.total,0);
  document.getElementById('coverage').textContent=Math.round(ratio*100)+' %';
  window.oldtownStudy={mode,view,parts,coverage,ratio,assets:state.assetFailures,independent:true,
    clear:parts.every((p,i)=>parts.every((q,j)=>i===j||!foundationsOverlap(p,q))),piazza:plan.piazza,alley:plan.alley};
  viewStatus();
}
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
  mode=button.dataset.mode;selected=null;if(view==='restaurant')view='all';
  const card=document.getElementById('selection'),p=document.createElement('p'),b=document.createElement('b'),dot=document.createElement('span');
  b.textContent='Ein Restaurant auswählen. ';p.append(b,'Die Schilder führen dich zu den Eingängen. „Höfe zeigen“ öffnet den Blick hinter die Straßenfassaden.');dot.className='dot';card.replaceChildren(dot,p);
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button));rebuild();
});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>fitView(button.dataset.view));
courtToggle.addEventListener('change',updateMarks);
document.getElementById('zoomIn').addEventListener('click',()=>zoom(1.25));
document.getElementById('zoomOut').addEventListener('click',()=>zoom(.8));
document.getElementById('fit').addEventListener('click',()=>fitView('all'));
const local=event=>{const r=app.canvas.getBoundingClientRect();return{x:(event.clientX-r.left)*app.screen.width/r.width,y:(event.clientY-r.top)*app.screen.height/r.height};};
app.canvas.addEventListener('pointerdown',event=>{
  if(!pointers.size)moved=0;pointers.set(event.pointerId,local(event));app.canvas.setPointerCapture(event.pointerId);
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);moved=10;}
});
app.canvas.addEventListener('pointermove',event=>{
  const previous=pointers.get(event.pointerId);if(!previous)return;
  const p=local(event);pointers.set(event.pointerId,p);
  if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)zoom(d/pinchDistance,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});pinchDistance=d;}
  else{const dx=p.x-previous.x,dy=p.y-previous.y;moved+=Math.hypot(dx,dy);camera.x+=dx;camera.y+=dy;viewStatus();}
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])app.canvas.addEventListener(type,event=>{pointers.delete(event.pointerId);pinchDistance=0;});
app.canvas.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?.9:1.1,local(event));},{passive:false});
new ResizeObserver(()=>requestAnimationFrame(()=>{app.resize();fitView(view);})).observe(root);
app.ticker.add(t=>updatePeople(t.deltaMS));
document.getElementById('loading').hidden=true;rebuild();
