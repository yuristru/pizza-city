// Pack actual foundation widths along a common street edge. Remaining land is
// deliberately kept as one passage at the row end, never spread between houses.
export function frontageRow(length,required,pool,random){
  const houses=[],margin=.18,available=length-margin*2;
  let used=0;
  for(const item of required){
    if(used+item.width>available+1e-7)throw new Error('Required frontage does not fit its parcel.');
    houses.push({...item,start:used});used+=item.width;
  }
  for(let n=0;n<12;n++){
    const candidates=pool.filter(item=>used+item.width<=available+1e-7);
    if(!candidates.length)break;
    const item=candidates[Math.min(candidates.length-1,Math.floor(random(n)*candidates.length))];
    houses.push({...item,start:used});used+=item.width;
  }
  const offset=random(37)>.5?margin:length-margin-used;
  return houses.map(item=>({...item,start:item.start+offset}));
}
