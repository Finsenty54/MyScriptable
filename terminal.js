// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;

// Change these to your usernames!
const user = "";

// API PARAMETERS !important
// WEATHER_API_KEY, you need an Open Weather API Key
// You can get one for free at: https://home.openweathermap.org/api_keys (account needed).
const WEATHER_API_KEY = "";
const WEATHER_HEFENG_API_KEY = ""; //和风API key, https://dev.heweather.com/
const TIANHE_LOCATION_API_KEY = ""; //天宫位置API key, n2yo.com
// Cache keys and default location
const CACHE_KEY_LAST_UPDATED = 'last_updated';

const DEFAULT_LOCATION = {
  latitude: 11,
  longitude: 11
};
// const refreshInterval = 30   //刷新间隔  时间单位：分钟

/******/
// Get current date and time
const updatedAt = new Date().toLocaleString();

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
  leftStack.spacing = 6; //元素之间的间距
  //leftStack.size = new Size(200, 0); //stack的大小 ：宽*长

  const time = new Date()
  const dfTime = new DateFormatter()
  dfTime.locale = "zh-cn"
  dfTime.useMediumDateStyle()
  dfTime.useNoTimeStyle()

  const firstLine = leftStack.addText(`${user} ~$ now`)
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

  const Progress = leftStack.addText(`[⏳] ${renderYearProgress()}`)
  Progress.textColor = new Color('#f19c65')
  Progress.font = new Font('Menlo', 11)

  const locationTianGong = leftStack.addText(`[️️🛰] CSS: ${data.tiangong.location}上空`)
  locationTianGong.textColor = new Color("#c6ffdd")
  locationTianGong.font = new Font("Menlo", 11)

  // Updated time
  const updatedTime = leftStack.addText('Last updated:' + " " + updatedAt);
  updatedTime.textColor = Color.white();
  updatedTime.textOpacity = 0.7;
  updatedTime.font = new Font("Menlo", 7);

  stack.addSpacer();
  const rightStack = stack.addStack();
  rightStack.spacing = 2;
  rightStack.layoutVertically();
  rightStack.bottomAlignContent();

  addWeatherLine(rightStack, data.weather.icon, 32);
  addWeatherLine(rightStack, `${data.weather.description}, ${data.weather.temperature}℃`, 12, true);
  addWeatherLine(rightStack, `${data.hefengweather.low}℃ -> ${data.hefengweather.high}℃`);
  addWeatherLine(rightStack, `Sunset, ${data.hefengweather.sunset}`);
  addWeatherLine(rightStack, `t: ${data.hefengweather.tomorrowDay} -> ${data.hefengweather.tomorrowNight}`);
  addWeatherLine(rightStack, `t: ${data.hefengweather.tomorrowTempMin}℃ -> ${data.hefengweather.tomorrowTempMax}℃`);

  // let nextRefresh = Date.now() + 1000 * 60 * parseInt(refreshInterval)// add 30 min to now
  // console.log('刷新时间戳==》' + nextRefresh)
  // w.refreshAfterDate = new Date(nextRefresh) //下次刷新时间
  // console.log('刷新时间==》' + new Date(nextRefresh))

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

  // Get last data update time (and set)
  const lastUpdated = await getLastUpdated();
  cache.write(CACHE_KEY_LAST_UPDATED, new Date().getTime());

  return {
    weather,
    hefengweather,
    tiangong,
    lastUpdated,
  }
}

function renderProgress(progress) {
  const used = '#'.repeat(Math.floor(progress * 8))
  const left = '.'.repeat(8 - used.length)
  return `[${used}${left}] ${Math.round(progress * 100)}%`
}

function renderBattery() {
  const batteryLevel = Device.batteryLevel()
  return renderProgress(batteryLevel)
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
    } catch (error) {
      location = await cache.read('location');
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const address = await Location.reverseGeocode(location.latitude, location.longitude);
  const url = "https://api.openweathermap.org/data/2.5/weather?lat=" + location.latitude + "&lon=" + location.longitude + "&units=metric&lang=en&appid=" + WEATHER_API_KEY;
  const data = await fetchJson(`weather`, url, 5);

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
    } catch (error) {
      location = await cache.read('location');
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const url = "https://devapi.heweather.net/v7/weather/3d?location=" + location.longitude + "," + location.latitude + "&key=" + WEATHER_HEFENG_API_KEY + "&lang=zh-cn";
  const data = await fetchJson(`hefengweather`, url, 1440);

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
    } catch (error) {
      location = await cache.read('location');
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const url = "https://api.n2yo.com/rest/v1/satellite/positions/48274/" + location.latitude + "/" + location.longitude + "/0/2/&apiKey=" + TIANHE_LOCATION_API_KEY;
  const data = await fetchJson('tianhe', url, 10);

  const satlat = parseFloat(data.positions[0].satlatitude);
  const satlon = parseFloat(data.positions[0].satlongitude);

  if (satlat <= -60) {
    return {
      location: "Antarctica",
    }
  }

  if (satlon >= -15) {
    if (satlat >= 0 && satlon >= 45) {
      return {
        location: "Asia",
      }
    }
    else if (satlat >= 30 && satlon <= 45) {
      return {
        location: "Europe",
      }
    }
    else if (satlat <= 30 && satlon <= 45) {
      return {
        location: "Africa",
      }
    }
    else if (satlat <= 0 && satlon >= 115 && satlon <= 155) {
      if (satlat >= -45) {
        return {
          location: "Australia",
        }
      }
      else{
      return {
        location: "南洋",
      }
    }
    }
    else if (satlat <= 0 && satlon >= 45 && satlon <= 115) {
      return {
        location: "印度洋",
      }
    }
    else {
      return {
        location: "太平洋",
      }
    }
  }
  else {
    if (satlat >=15 && satlat >= (-satlon - 90) && satlon <= -60) {
      return {
        location: "北美",
      }
    }
    else if (satlat <= 15 && satlat >= -60 && satlon <= -30 && satlon <= -90) {
      return {
        location: "南美",
      }
    }
    else if (satlat <= (-satlon - 90) && satlon <= -90) {
      return {
        location: "太平洋",
      }
    }
    else {
      return {
        location: "大西洋",
      }
    }
  }
}

async function fetchJson(key, url, delay, headers) {
  const cached = await cache.read(key, delay); //超过delay分钟获取一遍数据，不然使用内存中的数据
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
      return cache.read(key, delay);
    } catch (error) {
      console.log(`Couldn't fetch ${url}`);
    }
  }
}

/*
 * Get the last updated timestamp from the Cache.
 */
async function getLastUpdated() {
  let cachedLastUpdated = await cache.read(CACHE_KEY_LAST_UPDATED);

  if (!cachedLastUpdated) {
    cachedLastUpdated = new Date().getTime();
    cache.write(CACHE_KEY_LAST_UPDATED, cachedLastUpdated);
  }

  return cachedLastUpdated;
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
