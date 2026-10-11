// Original geometric building templates. Grid coordinates describe occupied ground,
// independently of sprite padding, facade style or the height of the roof.
const rectangle=(w,d)=>[[0,0],[w,0],[w,d],[0,d]];
export const BUILDING_FOOTPRINTS=[
  {id:'compact',name:'Kleines Stadthaus',width:2,depth:2,floors:2,outline:rectangle(2,2),holes:[],style:'Ockerputz, Terrakottadach, grüne Fensterläden'},
  {id:'townhouse',name:'Schmales Reihenhaus',width:2,depth:3,floors:3,outline:rectangle(2,3),holes:[],style:'Schmale Putzfassade, Balkone, Laden im Erdgeschoss'},
  {id:'streetfront',name:'Zusammenhängende Straßenfront',width:4,depth:2,floors:3,outline:rectangle(4,2),holes:[],style:'Mehrere Fassadenachsen, Arkaden, gemeinsame Dachlinie'},
  {id:'corner-l',name:'L-förmiges Eckhaus',width:4,depth:3,floors:3,outline:[[0,0],[4,0],[4,1],[1,1],[1,3],[0,3]],holes:[],style:'Palazzo mit Seitenflügel und kleiner Hofterrasse'},
  {id:'courtyard-u',name:'U-förmiger Palazzo',width:4,depth:4,floors:3,outline:[[0,0],[4,0],[4,4],[3,4],[3,1],[1,1],[1,4],[0,4]],holes:[],style:'Offener Innenhof mit Loggia, Brunnen und Terrakottadächern'},
  {id:'courtyard-ring',name:'Geschlossener Innenhof',width:4,depth:4,floors:3,outline:rectangle(4,4),holes:[[[1,1],[3,1],[3,3],[1,3]]],style:'Italienischer Wohnblock mit Durchgang und begrüntem Innenhof'}
];

function inside([x,y],polygon){
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
export function footprintCells(template){
  const cells=[];
  for(let y=0;y<template.depth;y++)for(let x=0;x<template.width;x++){
    const center=[x+.5,y+.5];
    if(inside(center,template.outline)&&!template.holes.some(hole=>inside(center,hole)))cells.push([x,y]);
  }
  return cells;
}
export function footprintAnchor(template){
  return template.outline.reduce((front,p)=>p[0]+p[1]>front[0]+front[1]?p:front,template.outline[0]);
}
export function projectFootprint([x,y],tileWidth=64){return [(x-y)*tileWidth/2,(x+y)*tileWidth/4];}
export function footprintFits(template,x,y,allowed,occupied=new Set()){
  return footprintCells(template).every(([dx,dy])=>allowed(x+dx+.5,y+dy+.5)&&!occupied.has(`${x+dx},${y+dy}`));
}
