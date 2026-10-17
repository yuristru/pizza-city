import {Container,Graphics,Rectangle,iso,label,state} from './pizza-core.js?v=20261016h';
import {personSprite} from './pizza-sprites.js?v=20261016h';
import {fruitTraderSites,traderOpen} from './pizza-fruit.js?v=20261016h';
import {openFruitTrader} from './pizza-fruit-ui.js?v=20261016h';

export function drawFruitTraders(objects,labels,gardens){
 state.cityFruitSites=fruitTraderSites(gardens);state.cityFruitStalls=[];
 for(const site of state.cityFruitSites){const g=new Container(),p=iso(site.x,site.y),art=new Graphics();
  art.poly([-23,-5,0,7,24,-5,0,-17]).fill(0x5b4930);art.poly([-23,-17,0,-5,24,-17,0,-29]).fill(0xb28c50);art.poly([-23,-17,0,-5,0,5,-23,-7]).fill(0x9a7442);art.poly([0,-5,24,-17,24,-7,0,5]).fill(0x775738);for(const x of [-17,17])art.circle(x,2,4).fill(0x33392d).circle(x,2,1.5).fill(0xb29b68);
  for(const x of [-21,21])art.rect(x,-40,2,27).fill(0x6b5a3e);art.poly([-27,-43,0,-56,28,-42,1,-29]).fill(0xe2d1a3);for(let i=0;i<4;i++){const a=i/4,b=(i+.5)/4;art.poly([-27+27*a,-43-13*a,-27+27*b,-43-13*b,1+27*b,-29-13*b,1+27*a,-29-13*a]).fill(0x5c7c45);}
  for(const [x,y,color]of [[-12,-18,0xa5784d],[0,-13,0xb79ac5],[12,-19,0x7da94c]])for(const dx of [-3,0,3])art.circle(x+dx,y-Math.abs(dx)*.3,2).fill(color);g.addChild(art);const vendor=personSprite(3,0);vendor.scale.set(.31);vendor.position.set(-30,-7);g.addChild(vendor);g.label='city-fruit-cart';g.fruitTraderId=site.id;g.position.set(p.x,p.y);g.zIndex=p.y;g.eventMode='static';g.cursor='pointer';g.hitArea=new Rectangle(-40,-56,75,65);const tap=()=>{if(!state.cityGesture?.moved)openFruitTrader(site.id);};g.on('pointertap',tap);objects.addChild(g);
  const tag=new Container(),bg=new Graphics().roundRect(-32,-9,64,18,3).fill(0x6b713f).stroke({color:0xe1c687,width:1}),text=label('OBSTWAGEN',8);text.anchor.set(.5);tag.addChild(bg,text);tag.label='city-fruit-marker';tag.fruitTraderId=site.id;tag.position.set(p.x,p.y-61);tag.zIndex=p.y+60;tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-35,-14,70,28);tag.on('pointertap',tap);labels.addChild(tag);state.cityFruitStalls.push({site,g,tag});
 }tickFruitTraders();
}
export function tickFruitTraders(){for(const {site,g,tag}of state.cityFruitStalls||[]){const visible=traderOpen(site.id,state.gameMinutes);g.visible=visible;tag.visible=visible;}}
