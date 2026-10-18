// Shared physical ramp surfaces and closed riding circuit, in city coordinates.
export function skateRamps(p){
 const run=Math.min(1.05,(p.x1-p.x0)*.22),depth=Math.min(1.3,(p.y1-p.y0)*.34);
 return [{x0:p.x0+.22,x1:p.x0+.22+run,y0:p.y0+.25,y1:p.y0+.25+depth,high:'left',height:10},
  {x0:p.x1-.22-run,x1:p.x1-.22,y0:p.y1-.25-depth,y1:p.y1-.25,high:'right',height:10}];
}
export function rampHeight(r,x){
 const t=Math.max(0,Math.min(1,(x-r.x0)/(r.x1-r.x0))),u=r.high==='left'?1-t:t;
 return r.height*u*u;
}
export function skaterPose(plan,phase){
 const [a,b]=skateRamps(plan),left=a.x0+.08,right=b.x1-.08;
 // A smooth outward/return trip connects both ramp centres without cutting a side wall.
 const angle=phase*Math.PI*2,u=(1-Math.cos(angle))/2,x=left+(right-left)*u;
 const ya=(a.y0+a.y1)/2,yb=(b.y0+b.y1)/2;
 const t=Math.max(0,Math.min(1,(x-a.x1)/(b.x0-a.x1))),smooth=t*t*(3-2*t);
 const y=ya+(yb-ya)*smooth+Math.sin(angle)*.12*Math.sin(Math.PI*t);
 const ramp=x<a.x1?a:x>b.x0?b:null,z=ramp?rampHeight(ramp,x):0;
 return {x,y,z,ramp,dir:Math.sin(angle)>=0?1:-1};
}
