import assert from 'node:assert/strict';
import {summarizeForecast} from '../dist/forecast/forecast.mjs';
const days=['2026-09-10','2026-09-11'];
const result=summarizeForecast({},days,'porcini',days[0]);assert.equal(result.best,null);assert.equal(result.window,null);assert.equal(result.current.score,null);assert.equal(result.daily.length,2);
const full=Array.from({length:37},(_,i)=>new Date(Date.UTC(2026,7,11+i,12)).toISOString().slice(0,10));
const a=n=>full.map(()=>n),env={forest:{features:[{layer:'rt_ucs.iducs.10k.2019.rt.full',properties:{ucs2019:'311'}},{layer:'rt_ucs.idvegfor.rt.4',properties:{}}]},terrain:{slope:10,aspect:0},weather:{daily:{time:full,precipitation_sum:a(5),temperature_2m_mean:a(20),temperature_2m_min:a(15),wind_speed_10m_max:a(8),et0_fao_evapotranspiration:a(1)}}};
const good=summarizeForecast(env,full.slice(30),'aereus',full[31]);assert(good.best);assert.equal(good.current.day,full[31]);assert(good.best.score>=good.current.score);assert.deepEqual(good.window,[full[30],full[36]]);
console.log('PASS: missing forecasts remain empty; selected day; maximum; contiguous seven-day window.');
