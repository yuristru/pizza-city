// Every foundation and roof edge uses the city's exact 2:1 pixel projection.
export function warehouseCanvas(){
 const canvas=document.createElement('canvas');canvas.width=124;canvas.height=98;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x+76,y+94):c.moveTo(x+76,y+94));c.closePath();c.fill();};
 poly([[0,0],[-70.4,-35.2],[-70.4,-67.2],[0,-32]],'#a98c69');
 poly([[0,0],[44.8,-22.4],[44.8,-54.4],[0,-32]],'#d6bc90');
 poly([[0,-32],[-70.4,-67.2],[-25.6,-89.6],[44.8,-54.4]],'#65756c');
 for(let n=0;n<6;n++){const x=-66+n*11;c.strokeStyle='#809188';c.lineWidth=1;c.beginPath();c.moveTo(76+x,94-32+x*.5);c.lineTo(76+x+44.8,94-54.4+x*.5);c.stroke();}
 for(const x of [-58,-29]){
  poly([[x,x*.5-1],[x+22,(x+22)*.5-1],[x+22,(x+22)*.5-25],[x,x*.5-25]],'#384f52');
  for(let y=5;y<24;y+=4)poly([[x+1,x*.5-y],[x+21,(x+21)*.5-y],[x+21,(x+21)*.5-y-1],[x+1,x*.5-y-1]],'#91a6a2');
 }
 poly([[12,-6],[22,-11],[22,-26],[12,-21]],'#416063');
 poly([[30,-17],[40,-22],[40,-32],[30,-27]],'#775d3d');
 poly([[30,-27],[40,-32],[35,-34.5],[25,-29.5]],'#c89c58');
 c.fillStyle='#e9dfba';c.fillRect(39,42,21,6);c.fillStyle='#344b4e';c.font='bold 5px sans-serif';c.fillText('LAGER',40,47);
 return canvas;
}
