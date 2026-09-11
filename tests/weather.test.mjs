import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {outdoorScore,sevenDayWeather} from '../dist/clients/weather.mjs';

assert.equal(outdoorScore(0,24,10),100);
assert.ok(outdoorScore(8,34,35)<outdoorScore(0,24,10));
assert.equal(outdoorScore(null,24,10),null);
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
const result=sevenDayWeather({delivery:'test',daily:{time:[today],precipitation_sum:[1],temperature_2m_min:[14],temperature_2m_max:[24],wind_speed_10m_max:[12],weather_code:[2]}});
assert.equal(result.status,'ok');assert.equal(result.daily.time[0],today);assert.equal(result.daily.outdoor_score.length,1);
const fallback=JSON.parse(await readFile(new URL('../dist/trekking-fallback.json',import.meta.url),'utf8'));
assert.ok(fallback.trails.length>=20);assert.ok(fallback.trails.every(x=>x.id&&x.name&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)));
assert.ok(fallback.trails.some(x=>x.name==='A4 Cala di Forno'));assert.ok(fallback.nature.some(x=>x.name==='Cala di Forno'));
console.log('PASS: browser weather fallback scoring and seven-day projection.');
