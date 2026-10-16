// Stable identities, fresh locations on every generated map. No housing is removed.
export function cityContactPlan(layout,gardens){
 const benches=gardens.map((g,i)=>({id:i?'bench-rocco':'bench-nino',type:'bench',name:i?'Rocco, der Nachtvogel':'Nino, der Zeitungsleser',place:i?'Bank am Domgarten':'Bank am Amphitheater',blockId:g.id,...g.benches[i?1:0],art:i}));
 const parks=layout.blocks.filter(b=>b.landUse==='park').sort((a,b)=>(b.x1-b.x0)*(b.y1-b.y0)-(a.x1-a.x0)*(a.y1-a.y0));
 const b=parks[0],cx=b?(b.x0+b.x1)/2:0,cy=b?(b.y0+b.y1)/2:0,w=b?Math.min(6.5,b.x1-b.x0-1.3):0,d=b?Math.min(4.2,b.y1-b.y0-1.3):0,skatepark=b?{blockId:b.id,x0:cx-w/2,x1:cx+w/2,y0:cy-d/2,y1:cy+d/2}:null;
 const skaters=skatepark?[{id:'skate-crew',type:'skate',name:'Die Rampencrew',place:'Skaterpark',blockId:b.id,x:cx,y:skatepark.y1-.4,art:3}]:[];
 const phones=gardens.map((g,i)=>({id:i?'phone-dom':'phone-arena',type:'phone',name:i?'Telefonzelle am Dom':'Telefonzelle an der Arena',place:i?'Domgarten':'Amphitheater',blockId:g.id,x:g.streetEntrance.x+1.1,y:g.y1-.35,art:2}));
 const piazza=layout.blocks.find(b=>b.landUse==='piazza');if(piazza)phones.push({id:'phone-piazza',type:'phone',name:'Telefonzelle an der Piazza',place:'Öffentlicher Platz',blockId:piazza.id,x:(piazza.x0+piazza.x1)/2,y:piazza.y1-.45,art:2});
 return {sites:[...benches,...skaters,...phones],skatepark};
}
