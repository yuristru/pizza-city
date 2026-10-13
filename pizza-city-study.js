import {app,world,state,Container,Graphics,iso,label} from './pizza-core.js?v=20261013d';
import {ATLASES,loadCityArt,citySprite} from './pizza-city-art.js?v=study3';
import {groundProjection} from './pizza-isometric-art.js?v=20261013d';
import {BUILDING_FOOTPRINTS,footprintAnchor} from './pizza-city-footprints.js?v=20261013d';
import {carSprite} from './pizza-city-traffic.js?v=20261013d';
import {personSprite} from './pizza-sprites.js?v=20261013d';

// Deliberately isolated study. No generator changes, navigation or save writes.
app.renderer.background.color=0xe9e7dc;
await loadCityArt();
if(state.assetFailures.length)throw new Error('Fehlende Testgrafiken: '+state.assetFailures.join(', '));
document.querySelector('#loading').hidden=true;
const camera=new Container(),ground=new Container(),objects=new Container(),overlay=new Container();
objects.sortableChildren=true;camera.addChild(ground,objects,overlay);world.addChild(camera);
const controls=Object.fromEntries(['roadWidth','setback','footprints','xray','probe'].map(id=>[id,document.getElementById(id)]));
let mode='loose',records=[],bounds=null,actor=null,actorMarker=null,selected=null;
const variants=[0,1,2,4],walk=.28,frontY=6;
const descriptions={
  loose:['Einzelhäuser mit Zwischenräumen','Viele Häuser, wenig Straßenfront.','Zwischen den Baukörpern liegt jeweils 0,7 Rastereinheiten Freiraum. Die Häuser sind individuell lesbar, wirken aber auch bei schmaler Fahrbahn wie einzelne Objekte.'],
  joined:['Gemessene Sockelkanten ohne Zwischenraum','Sockel passen. Dächer nicht automatisch.','Dieselben Häuser berühren sich an ihren gemessenen Grundflächen. Achte auf Dachüberstände, Markisen an gemeinsamen Wänden und unterschiedliche Traufhöhen. Die Ecke besteht ebenfalls aus einzelnen Bestandshäusern.'],
  court:['Vorbereitete Hofgruppe mit bewusster Passage','Eine klare Form, begrenzte Kombinierbarkeit.','Der Palazzo bündelt drei Flügel in einem Sprite. Zwei Nachbarhäuser bleiben durch eine absichtliche Passage getrennt. Die Hofstruktur wirkt zusammenhängend; ihre Außenanschlüsse und die Tiefe im Hof bleiben eigene Probleme.']
};
const point=(x,y)=>{const p=iso(x,y);return [p.x,p.y];};
function polygon(layer,vertices,color,alpha=1,lineColor){
  const g=new Graphics().poly(vertices.flatMap(([x,y])=>point(x,y))).fill({color,alpha});
  if(lineColor!==undefined)g.stroke({color:lineColor,width:1});layer.addChild(g);return g;
}
function rect(layer,x,y,w,d,color,alpha=1,lineColor){return polygon(layer,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],color,alpha,lineColor);}
function line(layer,a,b,color,width=1){const g=new Graphics().moveTo(...point(...a)).lineTo(...point(...b)).stroke({color,width});layer.addChild(g);return g;}
function at(layer,object,x,y){const p=iso(x,y);object.position.set(p.x,p.y);object.zIndex=p.y;layer.addChild(object);return object;}
function measured(index){
  const [,,w,,width,corners]=ATLASES.find(a=>a.key==='buildingExtras').frames[index],projection=groundProjection(corners);
  const unit=projection.scaleX*width/w/32;
  return {width:(corners[1][0]-corners[0][0])*unit,depth:(corners[2][0]-corners[1][0])*unit};
}
function select(record){
  selected=record;
  document.getElementById('selection').textContent=record.role+' · '+record.kind+' #'+record.index+'. '+(record.template?'Geplante Grundfläche '+record.template.width+' × '+record.template.depth+'.':'Gemessener Sockel '+record.width.toFixed(2)+' × '+record.depth.toFixed(2)+'.')+' Die Auswahl verwendet die tatsächliche Alpha-Fläche des Sprites.';
  drawSelection();
}
let selectionTag=null;
function drawSelection(){
  if(selectionTag){selectionTag.destroy({children:true});selectionTag=null;}
  if(!selected)return;
  selectionTag=new Container();const text=label(selected.role,10,'#fff3cd'),bg=new Graphics();text.anchor.set(.5,.5);
  bg.roundRect(-text.width/2-9,-11,text.width+18,22,3).fill(0x395844);selectionTag.addChild(bg,text);
  selectionTag.position.set(selected.sprite.x,selected.sprite.y-selected.sprite.height+12);overlay.addChild(selectionTag);
}
function addHouse(index,x0,front,role='Wohnhaus'){
  const size=measured(index),sprite=citySprite('buildings',index+8),record={...size,kind:'buildings',index:index+8,x:x0,y:front-size.depth,role,sprite};
  at(objects,sprite,x0+size.width,front);records.push(record);sprite.eventMode='static';sprite.cursor='pointer';sprite.on('pointertap',()=>select(record));return record;
}
function drawGround(road,setback){
  for(let y=-.5;y<11;y+=.5)for(let x=-1;x<12;x+=.5)rect(ground,x,y,.49,.49,(Math.floor(x*2+y*2)%3===0)?0xcac1a9:0xd4cab1);
  const center=frontY+setback+walk+road/2;
  rect(ground,-1,center-road/2-walk,13,road+walk*2,0xb5aa90);
  rect(ground,-1,center-road/2,13,road,0x666c62);
  // A short side street makes the street corner visible without a city-wide grid.
  const side=-setback-walk-road/2;
  rect(ground,side-road/2-walk,-.5,road+walk*2,center+.5,0xb5aa90);
  rect(ground,side-road/2,-.5,road,center+.5,0x666c62);
  if(road>1)for(let x=-.5;x<12;x+=1.1)line(ground,[x,center],[x+.45,center],0xe7d9b6,1);
  at(objects,carSprite(0,0,1),7,center-.16);at(objects,carSprite(1,0,-1),3,center+.16);
  const pedestrian=personSprite(1,0);pedestrian.scale.set(.33);at(objects,pedestrian,8,frontY+setback+.14);
  return center;
}
function foundation(record){
  const vertices=record.template?record.template.outline.map(([x,y])=>[record.x+x,record.y+y]):[[record.x,record.y],[record.x+record.width,record.y],[record.x+record.width,record.y+record.depth],[record.x,record.y+record.depth]];
  polygon(overlay,vertices,0x289f94,.08,0x239c90);
  const p=record.sprite.position;overlay.addChild(new Graphics().circle(p.x,p.y,2.2).fill(0x167f77));
}
function updateProbe(){
  const t=Number(controls.probe.value)/100;
  // The courtyard probe stays in the U's empty 1<x<3, 1<y<4 region.
  const x=mode==='court'?3.25:5,y=mode==='court'?6.7-3.4*t:frontY+.1+t*2;
  const p=iso(x,y);actor.position.set(p.x,p.y);actor.zIndex=p.y;actorMarker.position.copyFrom(actor.position);
  document.getElementById('probeValue').textContent=Math.round(t*100)+' %';
  window.cityStudy.probe={x,y,z:p.y,insideCourt:mode==='court'&&y<6&&y>3};
  app.render();
}
function fit(){
  if(!bounds)return;
  const scale=Math.min((app.screen.width-30)/bounds.width,(app.screen.height-32)/bounds.height,1.5);
  camera.scale.set(scale);camera.position.set((app.screen.width-bounds.width*scale)/2-bounds.x*scale,(app.screen.height-bounds.height*scale)/2-bounds.y*scale);
  document.getElementById('zoomValue').textContent=Math.round(scale*100)+' %';app.render();
}
function render(){
  selected=null;selectionTag=null;records=[];
  for(const layer of [ground,objects,overlay])layer.removeChildren().forEach(c=>c.destroy({children:true}));
  const road=Number(controls.roadWidth.value),setback=Number(controls.setback.value),gap=mode==='loose'?.7:0;
  const center=drawGround(road,setback);
  const [title,heading,description]=descriptions[mode];
  document.getElementById('sceneTitle').textContent=title;document.getElementById('findingTitle').textContent=heading;document.getElementById('finding').textContent=description;
  if(mode!=='court'){
    let x=0;
    for(const [i,index]of variants.entries()){
      const h=addHouse(index,x,frontY,i===1?'Restaurant im Test':'Wohnhaus');
      if(i&&mode==='joined')line(overlay,[x,Math.max(h.y,records[i-1].y)],[x,frontY],0xd59b2d,2);
      x+=h.width+gap;
    }
    const first=records[0];addHouse(4,0,first.y-gap,'Eckflügel');
    addHouse(1,0,records.at(-1).y-gap,'Rückwärtiges Haus');
    rect(ground,2.1,1.2,3.7,2.7,0xb7bd95);line(overlay,[0,frontY],[x-gap,frontY],0xd59b2d,1);
  }else{
    const template=BUILDING_FOOTPRINTS.find(t=>t.id==='courtyard-u'),sprite=citySprite('courtyardBuildings',1),[ax,ay]=footprintAnchor(template);
    const record={kind:'courtyardBuildings',index:1,x:2,y:2,width:4,depth:4,role:'Palazzo mit offenem Hof',sprite,template};
    at(objects,sprite,2+ax,2+ay);records.push(record);sprite.eventMode='static';sprite.cursor='pointer';sprite.on('pointertap',()=>select(record));
    addHouse(1,6.6,6,'Restaurant an der Passage');addHouse(2,6.6+measured(1).width,6,'Nachbarhaus');
    rect(ground,3,3,2,3,0xc7bba0);line(overlay,[6.3,2],[6.3,6],0xd59b2d,2);
  }
  const opposite=addHouse(0,3.3,frontY+2*(setback+walk)+road+measured(0).depth,'Gegenüberliegende Fassade');
  // Measurement goes from the front facade to the opposite rear foundation.
  line(overlay,[9,frontY],[9,opposite.y],0xd59b2d,2);
  for(const y of [frontY,opposite.y])line(overlay,[8.85,y],[9.15,y],0xd59b2d,2);
  for(const record of records){record.sprite.alpha=controls.xray.checked?.35:1;foundation(record);}
  actor=personSprite(2,0);actor.scale.set(.33);actor.tint=0xff72a8;objects.addChild(actor);
  actorMarker=new Graphics().ellipse(0,0,5,2.5).stroke({color:0xc34774,width:1.5});overlay.addChild(actorMarker);
  overlay.visible=controls.footprints.checked;
  document.getElementById('roadValue').textContent=road.toFixed(2);document.getElementById('setbackValue').textContent=setback.toFixed(2);
  document.getElementById('facadeWidth').textContent=(road+2*walk+2*setback).toFixed(2);document.getElementById('buildingCount').textContent=records.length;
  document.getElementById('probeNote').textContent=mode==='court'?'Die Figur läuft von der Hoföffnung nach innen. Ihre Bodenmarkierung liegt als Diagnose darüber; die Figur selbst wird wie im Spiel nach x+y sortiert. Transparenz zeigt verdeckte Positionen.':'Die Figur quert den Straßenraum als Maßstabs- und Überdeckungsprobe. Dies ist kein simulierter Fußgängerweg.';
  document.getElementById('selection').textContent='Ein Haus antippen, um seine Rolle und Auswahlfläche zu prüfen.';
  window.cityStudy={mode,road,setback,facadeDistance:road+2*walk+2*setback,records:records.map(({sprite,...r})=>({...r,z:sprite.zIndex})),sceneObjects:objects.children.length,diagnostic:true};
  updateProbe();bounds=camera.getLocalBounds();fit();
}
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{mode=button.dataset.mode;for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button));render();});
for(const [id,control]of Object.entries(controls))control.addEventListener('input',()=>id==='probe'?updateProbe():render());
new ResizeObserver(()=>requestAnimationFrame(fit)).observe(document.getElementById('app'));
render();
