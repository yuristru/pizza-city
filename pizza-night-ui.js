import {state,root,saveLayout,notify} from './pizza-core.js?v=20261014a';
import {SECONDS_PER_MINUTE} from './pizza-daily.js?v=20261014a';
import {tickService} from './pizza-service-runtime.js?v=20261014a';
import {isNight,cityBrightness,nightSkipTarget} from './pizza-night.js?v=20261014a';
let skipping=false,stamp='';
export function renderNightUI(){
  const key=[Math.floor(state.gameMinutes),state.ready,skipping].join(':');if(key===stamp)return;stamp=key;
  root.style.setProperty('--city-brightness',String(cityBrightness(state.gameMinutes)));
  root.dataset.night=String(isNight(state.gameMinutes));root.dataset.skippingNight=String(skipping);
  const button=document.getElementById('skipNightBtn');button.hidden=!isNight(state.gameMinutes)&&!skipping;button.disabled=skipping||!state.ready;
  button.setAttribute('aria-busy',String(skipping));button.title=skipping?'Nacht wird vorgespult...':'Nacht überspringen bis 11:00 Uhr. Einnahmen und Betriebskosten laufen weiter.';
}
export async function skipNight(update){
  const target=nightSkipTarget(state.gameMinutes);if(skipping||!state.ready||target===null)return false;
  skipping=true;const speed=state.speed,buttons=[...document.querySelectorAll('[data-speed]')],disabled=buttons.map(b=>b.disabled);state.speed=0;buttons.forEach(b=>b.disabled=true);renderNightUI();
  try{
    while(state.gameMinutes<target-1e-8){
      const before=state.gameMinutes;tickService(Math.min(300,(target-before)*SECONDS_PER_MINUTE));
      if(state.gameMinutes<=before)throw new Error('Die Spielzeit konnte nicht weiterlaufen.');
      update?.();await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    state.gameMinutes=target;saveLayout(true);notify('Nacht übersprungen. Die Mittagsschicht beginnt um 11:00 Uhr.');return true;
  }catch(error){notify('Vorspulen angehalten: '+error.message);return false;}
  finally{skipping=false;state.speed=speed;buttons.forEach((b,i)=>b.disabled=disabled[i]);renderNightUI();update?.();}
}
export function mountNightUI(update){document.getElementById('skipNightBtn').onclick=()=>skipNight(update);}
