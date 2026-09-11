/** Funzioni meteo condivise e fallback browser verso Open-Meteo. */
export async function fetchBrowserWeather(lat, lon) {
  const q = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Rome',
    past_days: 30,
    forecast_days: 7,
    daily:
      'weather_code,precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,wind_speed_10m_max,et0_fao_evapotranspiration',
    hourly:
      'soil_temperature_6cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,relative_humidity_2m,vapour_pressure_deficit',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, {
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw Error(`Meteo non disponibile (${response.status})`);
  const weather = await response.json();
  if (!weather.daily || !weather.hourly) throw Error('Meteo incompleto');
  return {
    ...weather,
    retrievedAt: Date.now() / 1000,
    status: 'ok',
    delivery: 'diretta al browser',
  };
}

export function outdoorScore(rain, tmax, wind) {
  if (![rain, tmax, wind].every(Number.isFinite)) return null;
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 -
          Math.min(45, rain * 9) -
          Math.max(0, wind - 18) * 1.8 -
          Math.max(0, 8 - tmax) * 5 -
          Math.max(0, tmax - 30) * 4,
      ),
    ),
  );
}

export function sevenDayWeather(weather) {
  const d = weather?.daily;
  if (!d?.time?.length) return { status: 'unavailable' };
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
  const found = d.time.indexOf(today),
    start = found >= 0 ? found : Math.max(0, d.time.length - 7),
    end = start + 7;
  const keys = [
    'time',
    'precipitation_sum',
    'temperature_2m_min',
    'temperature_2m_max',
    'wind_speed_10m_max',
    'weather_code',
  ];
  const daily = Object.fromEntries(keys.map((k) => [k, (d[k] ?? []).slice(start, end)]));
  daily.outdoor_score = daily.time.map((_, i) =>
    outdoorScore(
      daily.precipitation_sum[i],
      daily.temperature_2m_max[i],
      daily.wind_speed_10m_max[i],
    ),
  );
  return { daily, status: 'ok', delivery: weather.delivery };
}
