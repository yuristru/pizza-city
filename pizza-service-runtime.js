import {state,saveLayout,updateMoney} from './pizza-core.js?v=20261011h';
import {serviceMenu} from './pizza-menu-ui.js?v=20261011h';
import {advanceService} from './pizza-service.js?v=20261011h';

let checkpoint=state.service.elapsed;
export function tickService(seconds){
  const result=advanceService(state.service,seconds,state.restaurantState,serviceMenu(),Math.round(state.balance*100));
  state.balance=result.balanceCents/100;
  if(result.events.length)updateMoney();
  if(result.events.length||state.service.elapsed-checkpoint>=5){saveLayout(true);checkpoint=state.service.elapsed;}
  return result.events;
}
