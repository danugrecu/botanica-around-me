import assert from 'node:assert/strict';
import {predict,habitat,profiles,num} from '../dist/ecology.mjs';
const time=Array.from({length:37},(_,i)=>new Date(Date.UTC(2026,7,11+i,12)).toISOString().slice(0,10));
const constant=n=>time.map(()=>n),hours=time.flatMap(t=>Array.from({length:24},(_,i)=>`${t}T${String(i).padStart(2,'0')}:00`));
const env={forest:{status:'ok',features:[{layer:'rt_ucs.iducs.10k.2019.rt.full',properties:{ucs2019:'311',des2019:'Boschi di latifoglie'}},{layer:'rt_ucs.idvegfor.rt.4',properties:{}}]},soil:{features:[{properties:{awc:'160',sab:'30',arg:'25',sostorg:'2'}}]},terrain:{elevation:400,slope:15,aspect:0},weather:{daily:{time,precipitation_sum:constant(4),temperature_2m_mean:constant(19),temperature_2m_min:constant(13),temperature_2m_max:constant(23),wind_speed_10m_max:constant(10),et0_fao_evapotranspiration:constant(2)},hourly:{time:hours,...Object.fromEntries(Object.entries({soil_temperature_6cm:19,soil_moisture_3_to_9cm:.27,soil_moisture_9_to_27cm:.29,relative_humidity_2m:75,vapour_pressure_deficit:.5}).map(([k,v])=>[k,hours.map(()=>v)]))}}};
const date=time[30];
assert.equal(num(null),null);assert.equal(num(''),null);
for(const day of time.slice(30))for(const species of ['porcini',...Object.keys(profiles)]){const r=predict(env,day,species);assert(r.score>=0&&r.score<=100);}
const field=structuredClone(env);field.forest.features[0].properties.ucs2019='211';assert.equal(predict(field,date,'cucchi').score,null);assert.equal(habitat(field).woodland,false);
const unknown=structuredClone(env);unknown.forest.features=[];assert.equal(predict(unknown,date,'cucchi').score,null);
const missingRain=structuredClone(env);missingRain.weather.daily.precipitation_sum[15]=null;assert.equal(predict(missingRain,date,'edulis').score,null);
const noSoil=structuredClone(env);noSoil.weather.hourly.soil_moisture_3_to_9cm.fill(null);assert(predict(noSoil,date,'edulis').missing.includes('Umidità superficiale'));
const generic=structuredClone(env);generic.forest.features.pop();assert(predict(generic,date,'cucchi').score<=69);
const drought=structuredClone(env);drought.weather.daily.precipitation_sum.fill(0);drought.weather.hourly.soil_moisture_3_to_9cm.fill(.07);drought.weather.hourly.soil_moisture_9_to_27cm.fill(.07);assert(predict(drought,date,'cucchi').score<predict(env,date,'cucchi').score);
const frost=structuredClone(env);frost.weather.daily.temperature_2m_min[30]=-2;assert(predict(frost,date,'edulis').score<predict(env,date,'edulis').score);
assert.equal(predict(field,date,'cucchi','oak').habitat.scenario,true);assert.equal(predict(field,date,'cucchi').score,null);
const scores=Object.keys(profiles).filter(k=>k!=='cucchi').map(k=>predict(env,date,k).score);assert.equal(predict(env,date,'porcini').score,Math.max(...scores));
assert.throws(()=>predict(env,date,'unknown'));
console.log('PASS: 42 species/day combinations; forest exclusion; missing data; drought; frost; habitat cap; scenario isolation; group maximum.');
