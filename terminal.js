// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;

// Change these to your usernames!
const user = "Zentreisender";

// API PARAMETERS !important
// WEATHER_API_KEY, you need an Open Weather API Key
// You can get one for free at: https://home.openweathermap.org/api_keys (account needed).
const WEATHER_API_KEY = "6a672f01b829d5ffd5e70c98679a907a";
const WEATHER_HEFENG_API_KEY = "857323ba420d4dd896fdde37fd849409"; //和风API key, https://dev.heweather.com/
const TIANHE_LOCATION_API_KEY = "ECZXHE-MFJED3-CHVTGJ-4Y1T"; //天宫位置API key, n2yo.com
const DEFAULT_LOCATION = {
  latitude: 30.31323, 
  longitude: 120.34193
};
const refreshInterval = 30   //刷新间隔  时间单位：分钟

/******/

const Cache = importModule('Cache');
const cache = new Cache("termiWidgetCache");
const data = await fetchData();
const widget = createWidget(data);
Script.setWidget(widget);
Script.complete();

function createWidget(data) {
  console.log(data)
  const w = new ListWidget()
  const bgColor = new LinearGradient()
  bgColor.colors = [new Color("#29323c"), new Color("#1c1c1c")]
  bgColor.locations = [0.0, 1.0]
  w.backgroundGradient = bgColor
  w.setPadding(12, 15, 15, 12)

  const stack = w.addStack();
  stack.layoutHorizontally();

  const leftStack = stack.addStack();
  leftStack.layoutVertically();
  leftStack.spacing = 6; //总共6行
  leftStack.size = new Size(200, 0);

  const time = new Date()
  const dfTime = new DateFormatter()
  dfTime.locale = "zh-cn"
  dfTime.useMediumDateStyle()
  dfTime.useNoTimeStyle()

  const firstLine = leftStack.addText(`[🐮] ${user} ~$ now`)
  firstLine.textColor = Color.white()
  firstLine.textOpacity = 0.7
  firstLine.font = new Font("Menlo", 11)
  
  const timeLine = leftStack.addText(`[🗓] ${dfTime.string(time)}`)
  timeLine.textColor = Color.white()
  timeLine.font = new Font("Menlo", 11)
  
  const batteryLine = leftStack.addText(`[${Device.isCharging() ? '⚡️' : '🔋'}] ${renderBattery()}`)
  batteryLine.textColor = new Color("#6ef2ae")
  batteryLine.font = new Font("Menlo", 11)
  
  const locationLine = leftStack.addText(`[️️📍] Location: ${data.weather.location}`)
  locationLine.textColor = new Color("#7dbbae")
  locationLine.font = new Font("Menlo", 11)
  
  const Progress = widget.addText(`[⏳]${renderYearProgress()} YearProgress`)
  Progress.textColor = new Color('#f19c65')
  Progress.font = new Font('Menlo', 11)

  const locationTianGong = leftStack.addText(`[️️🛰] CSS位于: ${data.tiangong.location} 上空`)
  locationLine.textColor = new Color("#c6ffdd")
  locationLine.font = new Font("Menlo", 11)

  stack.addSpacer();
  const rightStack = stack.addStack();
  rightStack.spacing = 2;
  rightStack.layoutVertically();
  rightStack.bottomAlignContent();

  addWeatherLine(rightStack, data.weather.icon, 32);
  addWeatherLine(rightStack, `${data.weather.description}, ${data.weather.temperature}℃`, 12, true);
  addWeatherLine(rightStack, `${data.hefengweather.low}℃ -> ${data.hefengweather.high}℃`);
  addWeatherLine(rightStack, `Sunset: ${data.hefengweather.sunset}`);
  addWeatherLine(rightStack, `tomW: ${data.hefengweather.tomorrowDay} -> ${data.hefengweather.tomorrowNight}`);
  addWeatherLine(rightStack, `tomT: ${data.hefengweather.tomorrowTempMin}℃ -> ${data.hefengweather.tomorrowTempMax}℃`);

  let nextRefresh = Date.now() + 1000 * 60 * parseInt(refreshInterval)// add 30 min to now
  console.log('刷新时间戳==》' + nextRefresh)
  widget.refreshAfterDate = new Date(nextRefresh) //下次刷新时间
  console.log('刷新时间==》' + new Date(nextRefresh))

  return w
}

function addWeatherLine(w, text, size, bold) {
  const stack = w.addStack();
  stack.setPadding(0, 0, 0, 0);
  stack.layoutHorizontally();
  stack.addSpacer();
  const line = stack.addText(text);
  line.textColor = new Color("#ffcc66");
  line.font = new Font("Menlo" + (bold ? "-Bold" : ""), size || 11);
}

async function fetchData() {
  const weather = await fetchWeather();
  const hefengweather = await fetchHeFengWeather();
  const tiangong = await fetchTianGong();
  
  return {
    weather,
    hefengweather,
    tiangong,
  }
}

function renderProgress(progress) {
  const used = '▓'.repeat(Math.floor(progress * 8))
  const left = '░'.repeat(8 - used.length)
  return `${used}${left} ${Math.floor(progress * 100)}%`
}

function renderBattery() {
  const batteryLevel = Device.batteryLevel()
  const juice = "#".repeat(Math.floor(batteryLevel * 8))
  const used = ".".repeat(8 - juice.length)
  const batteryAscii = `[${juice}${used}] ${Math.round(batteryLevel * 100)}%`
  return batteryAscii
}

function renderYearProgress() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1) // Start of this year
  const end = new Date(now.getFullYear() + 1, 0, 1) // End of this year
  const progress = (now - start) / (end - start)
  return renderProgress(progress)
}

async function fetchWeather() {
  let location = await cache.read('location');
  if (!location) {
    try {
      Location.setAccuracyToThreeKilometers();
      location = await Location.current();
    } catch(error) {
      location = await cache.read('location');
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const address = await Location.reverseGeocode(location.latitude, location.longitude);
  const url = "https://api.openweathermap.org/data/2.5/weather?lat=" + location.latitude + "&lon=" + location.longitude + "units=metric&lang=en&appid=" + WEATHER_API_KEY;
  const data = await fetchJson(`weather`, url);

  return {
    location: address[0].locality,
    icon: getWeatherEmoji(data.weather[0].id, ((new Date()).getTime() / 1000) >= data.sys.sunset),
    description: data.weather[0].main,
    temperature: Math.round(data.main.temp),
  }
}

async function fetchHeFengWeather() {
  let location = await cache.read('location');
  if (!location) {
    try {
      Location.setAccuracyToThreeKilometers();
      location = await Location.current();
    } catch(error) {
      location = await cache.read('location');
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const url = "https://devapi.heweather.net/v7/weather/now?location="+location.longitude+","+location.latitude+"&key="+ WEATHER_HEFENG_API_KEY+"&lang=zh-cn";
  const data = await fetchJson(`hefengweather`, url);

  return {
    high: Math.round(data.daily[0].tempMax),
    low: Math.round(data.daily[0].tempMin),
    sunset: data.daily[0].sunset,
    tomorrowDay: data.daily[1].textDay,
    tomorrowNight: data.daily[1].textNight,
    tomorrowTempMax: data.daily[1].tempMax,
    tomorrowTempMin: data.daily[1].tempMin,
  }
}


async function fetchTianGong() {
  let location = await cache.read('location');
  if (!location) {
    try {
      Location.setAccuracyToThreeKilometers();
      location = await Location.current();
    } catch(error) {
      location = await cache.read('location');
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const url= "https://api.n2yo.com/rest/v1/satellite/positions/48274/"+location.latitude+"/"+location.longitude+"/0/2/&apiKey="+TIANHE_LOCATION_API_KEY;
  const data = await fetchJson('tianhe-l.json', url);
  
  const address = await Location.reverseGeocode(data.positions[0].satlatitude, data.positions[0].satlongitude);
  return {
    location: address[0].locality,
  }
}

async function fetchJson(key, url, headers) {
  const cached = await cache.read(key, 5); //超过5分钟获取一遍数据，不然使用内存中的数据
  if (cached) {
    return cached;
  }

  try {
    console.log(`Fetching url: ${url}`);
    const req = new Request(url);
    req.headers = headers;
    const resp = await req.loadJSON();
    cache.write(key, resp);
    return resp;
  } catch (error) {
    try {
      return cache.read(key, 5);
    } catch (error) {
      console.log(`Couldn't fetch ${url}`);
    }
  }
}

function getWeatherEmoji(code, isNight) {
  if (code >= 200 && code < 300 || code == 960 || code == 961) {
    return "⛈"
  } else if ((code >= 300 && code < 600) || code == 701) {
    return "🌧"
  } else if (code >= 600 && code < 700) {
    return "❄️"
  } else if (code == 711) {
    return "🔥" 
  } else if (code == 800) {
    return isNight ? "🌕" : "☀️" 
  } else if (code == 801) {
    return isNight ? "☁️" : "🌤"  
  } else if (code == 802) {
    return isNight ? "☁️" : "⛅️"  
  } else if (code == 803) {
    return isNight ? "☁️" : "🌥" 
  } else if (code == 804) {
    return "☁️"  
  } else if (code == 900 || code == 962 || code == 781) {
    return "🌪" 
  } else if (code >= 700 && code < 800) {
    return "🌫" 
  } else if (code == 903) {
    return "🥶"  
  } else if (code == 904) {
    return "🥵" 
  } else if (code == 905 || code == 957) {
    return "💨" 
  } else if (code == 906 || code == 958 || code == 959) {
    return "🧊" 
  } else {
    return "❓" 
  }
}
