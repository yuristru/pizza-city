// Stable identities, fresh locations on every generated map. No housing is removed.
export function cityContactPlan(layout,gardens){
 const benches=gardens.map((g,i)=>({id:i?'bench-rocco':'bench-nino',type:'bench',name:i?'Rocco, der Nachtvogel':'Nino, der Zeitungsleser',place:i?'Bank am Domgarten':'Bank am Amphitheater',blockId:g.id,...g.benches[i?1:0],night:{x:g.lamps[0].x+.18,y:g.lamps[0].y-.1},art:i}));
 const parks=layout.blocks.filter(b=>b.landUse==='park').sort((a,b)=>(b.x1-b.x0)*(b.y1-b.y0)-(a.x1-a.x0)*(a.y1-a.y0));
 const b=parks[0],cx=b?(b.x0+b.x1)/2:0,cy=b?(b.y0+b.y1)/2:0,w=b?Math.min(6.5,b.x1-b.x0-1.3):0,d=b?Math.min(4.2,b.y1-b.y0-1.3):0,skatepark=b?{blockId:b.id,x0:cx-w/2,x1:cx+w/2,y0:cy-d/2,y1:cy+d/2}:null;
 const skaters=skatepark?[{id:'skate-crew',type:'skate',name:'Die Rampencrew',place:'Skaterpark',blockId:b.id,x:cx,y:skatepark.y1+.4,art:3}]:[];
 const phones=gardens.map((g,i)=>({id:i?'phone-dom':'phone-arena',type:'phone',name:i?'Telefonzelle am Dom':'Telefonzelle an der Arena',place:i?'Domgarten':'Amphitheater',blockId:g.id,x:g.streetEntrance.x+1.1,y:g.y1-.35,art:2}));
 const piazza=layout.blocks.find(b=>b.landUse==='piazza');if(piazza)phones.push({id:'phone-piazza',type:'phone',name:'Telefonzelle an der Piazza',place:'Öffentlicher Platz',blockId:piazza.id,x:(piazza.x0+piazza.x1)/2,y:piazza.y1-.45,art:2});
 for(const [i,site]of benches.entries()){const park=parks[i%parks.length];if(park){const lamp=parkLampPoints(park)[parks.length===1&&i?5:4];site.night={x:lamp.x+.18,y:lamp.y+.1,blockId:park.id};}}
 return {sites:[...benches,...skaters,...phones],skatepark};
}

export function cityNight(minutes){const hour=((minutes%1440)+1440)%1440/60;return hour<7||hour>=19;}
export function skateSchedule(minutes){const hour=((minutes%1440)+1440)%1440/60;return hour<12?'absent':hour<19?'skating':'seated';}
export function contactAt(site,minutes){
 if(!site)return null;
 if(site.type==='skate')return {...site,x:site.x+(skateSchedule(minutes)==='skating'?.6:0),available:skateSchedule(minutes)!=='absent',activity:skateSchedule(minutes),hours:'12:00 bis 19:00 auf den Rampen, 19:00 bis 24:00 auf der Bank'};
 if(site.type==='bench'&&cityNight(minutes))return {...site,...site.night,available:true,activity:'night',name:site.id==='bench-nino'?'Der Mann unter der Laterne':'Die Frau im Laternenschein',place:'Unter der Laterne am Park',hours:'Tagsüber auf der Bank, nachts unter der Laterne'};
 return {...site,available:true,activity:site.type==='bench'?'day':'phone',hours:site.type==='bench'?'Tagsüber auf der Bank, nachts unter der Laterne':'Rund um die Uhr'};
}

export function parkLampPoints({x0,x1,y0,y1}){return [{x:x0+.2,y:y0+.2},{x:x1-.2,y:y0+.2},{x:x0+.2,y:y1-.2},{x:x1-.2,y:y1-.2},{x:x0+.2,y:(y0+y1)/2},{x:x1-.2,y:(y0+y1)/2}];}
