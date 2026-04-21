// Variables //
let currentCity = "Haifa";
let didUserSearch = false;
let debounceTimer = null;
let suggestions = [];
let activeSuggestionIndex = -1;
let lastWeatherData = null;
let uvChartState = null;

// API Key //
const WEATHER_API_KEY = "fde5b2fabe374b75971161715260404";

// DOM Elements //
const cityName = document.getElementById("cityName");
const mainTemp = document.getElementById("mainTemp");
const weatherStatus = document.getElementById("weatherStatus");
const minMaxTemp = document.getElementById("minMaxTemp");
const summaryText = document.getElementById("summaryText");

const hourlyContainer = document.getElementById("hourlyContainer");
const dailyContainer = document.getElementById("dailyContainer");
const sunsetNote = document.getElementById("sunsetNote");
const searchInput = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestionsBox");
const precipBox = document.getElementById("precipBox");
const alertsBox = document.getElementById("alertsBox");
const extraStatsBox = document.getElementById("extraStatsBox");

const uvModal = document.getElementById("uvModal");
const uvModalBackdrop = document.getElementById("uvModalBackdrop");
const uvModalClose = document.getElementById("uvModalClose");
const uvModalValue = document.getElementById("uvModalValue");
const uvModalLevel = document.getElementById("uvModalLevel");
const uvModalDesc = document.getElementById("uvModalDesc");
const uvModalAdvice = document.getElementById("uvModalAdvice");
const uvChartSvg = document.getElementById("uvChartSvg");
const uvChartHours = document.getElementById("uvChartHours");
const uvChartBox = document.getElementById("uvChartBox");
const uvChartTooltip = document.getElementById("uvChartTooltip");
const uvStandaloneBox = document.getElementById("uvStandaloneBox");

// Constants //
const hebrewDays = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"];

// City Translation //
function translateCityName(city) {
  const cityMap = {
    "Haifa": "חיפה",
    "Tel Aviv": "תל אביב",
    "Tel Aviv-Yafo": "תל אביב",
    "Jerusalem": "ירושלים",
    "Ashdod": "אשדוד",
    "Ashkelon": "אשקלון",
    "Netanya": "נתניה",
    "Nazareth": "נצרת",
    "Afula": "עפולה",
    "Migdal HaEmek": "מגדל העמק",
    "Kiryat Ata": "קריית אתא",
    "Kiryat Bialik": "קריית ביאליק",
    "Kiryat Yam": "קריית ים",
    "Kiryat Motzkin": "קריית מוצקין",
    "Tiberias": "טבריה",
    "Eilat": "אילת",
    "Beer Sheva": "באר שבע",
    "Beersheba": "באר שבע",
    "Rishon Lezion": "ראשון לציון",
    "Petah Tikva": "פתח תקווה",
    "Holon": "חולון",
    "Bat Yam": "בת ים",
    "Herzliya": "הרצליה",
    "Ramat Gan": "רמת גן",
    "Hadera": "חדרה",
    "Nahariya": "נהריה",
    "Safed": "צפת",
    "Zefat": "צפת",
    "Modiin": "מודיעין",
    "Modi'in": "מודיעין",
    "Rehovot": "רחובות",
    "Lod": "לוד",
    "Ramla": "רמלה"
  };

  return cityMap[city] || city;
}

// Date And Time Helpers //
function formatHour(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.getHours().toString().padStart(2, "0");
}

function getDayName(dateStr, index) {
  if (index === 0) return "היום";
  const date = new Date(dateStr);
  return hebrewDays[date.getDay()];
}

function formatTimeShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatAlertTime(dateStr) {
  if (!dateStr) return "לא צוין";

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Weather Helpers //
function getWindDirectionHebrew(deg) {
  if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return "—";

  const directions = [
    "צפון",
    "צפון-צפון מזרח",
    "צפון מזרח",
    "מזרח-צפון מזרח",
    "מזרח",
    "מזרח-דרום מזרח",
    "דרום מזרח",
    "דרום-דרום מזרח",
    "דרום",
    "דרום-דרום מערב",
    "דרום מערב",
    "מערב-דרום מערב",
    "מערב",
    "מערב-צפון מערב",
    "צפון מערב",
    "צפון-צפון מערב"
  ];

  const normalized = ((Number(deg) % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

function getIsDayFromTime(timeStr, sunriseStr, sunsetStr) {
  const time = new Date(timeStr).getTime();
  const sunrise = new Date(sunriseStr).getTime();
  const sunset = new Date(sunsetStr).getTime();

  return time >= sunrise && time < sunset ? 1 : 0;
}

function mapOpenMeteoCodeToAppCode(code) {
  const weatherCode = Number(code);

  if (weatherCode === 0) return 1000;
  if ([1, 2].includes(weatherCode)) return 1003;
  if (weatherCode === 3) return 1006;
  if ([45, 48].includes(weatherCode)) return 1030;
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return 1153;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 1183;
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 1210;
  if ([95, 96, 99].includes(weatherCode)) return 1276;

  return 1000;
}

function normalizeWeatherApiIcon(conditionCode, isDay = 1) {
  if (conditionCode === 1000) return isDay ? "clear_day" : "clear_night";
  if (conditionCode === 1003) return isDay ? "partly_cloudy_day" : "partly_cloudy_night";
  if ([1006, 1009].includes(conditionCode)) return "cloud";
  if ([1030, 1135, 1147].includes(conditionCode)) return "foggy";
  if ([1087, 1273, 1276, 1279, 1282].includes(conditionCode)) return "thunderstorm";

  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(conditionCode)) {
    return "rainy";
  }

  if ([1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(conditionCode)) {
    return "weather_snowy";
  }

  return isDay ? "clear_day" : "clear_night";
}

function getIconClass(iconName, isDay = 1) {
  if (iconName === "rainy") return "rain-icon";
  if (iconName === "cloud" || iconName === "foggy") return "cloud-icon";
  if (iconName === "thunderstorm") return "rain-icon";
  if (iconName === "weather_snowy") return "cloud-icon";
  if (iconName === "wb_twilight") return "sunset-icon";
  if (iconName === "wb_sunny") return "sunrise-icon";

  return isDay ? "sunny-icon" : "night-icon";
}

function getConditionTextHebrew(conditionCode, isDay = 1) {
  if (conditionCode === 1000) return isDay ? "בהיר" : "לילה בהיר";
  if (conditionCode === 1003) return "מעונן חלקית";
  if ([1006, 1009].includes(conditionCode)) return "מעונן";
  if ([1030, 1135, 1147].includes(conditionCode)) return "ערפילי";
  if ([1087, 1273, 1276, 1279, 1282].includes(conditionCode)) return "סופות רעמים";

  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(conditionCode)) {
    return "גשם";
  }

  if ([1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(conditionCode)) {
    return "שלג";
  }

  return "מזג אוויר משתנה";
}


// Forecast API //
async function getForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index,visibility` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,uv_index,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,visibility` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("שגיאה בשליפת מזג האוויר");
  }

  return await response.json();
}


// Alerts API //
async function getWeatherAlerts(lat, lon) {
  if (!WEATHER_API_KEY || WEATHER_API_KEY === "PASTE_YOUR_WEATHERAPI_KEY_HERE") {
    console.warn("WeatherAPI key is missing. Alerts are disabled.");
    return [];
  }

  const url =
    `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}` +
    `&q=${lat},${lon}&days=1&aqi=no&alerts=yes&lang=he`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Alerts API error:", errorText);
      return [];
    }

    const data = await response.json();

    console.log("Full alerts response:", data);
    console.log("Alerts object:", data.alerts);
    console.log("Alerts array:", data.alerts?.alert);
    console.log("Alerts count:", data.alerts?.alert?.length || 0);

    return data?.alerts?.alert || [];
  } catch (error) {
    console.error("Failed to load alerts:", error);
    return [];
  }
  return [
  {
    headline: "התרעת רוחות חזקות",
    severity: "Severe",
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    areas: "חיפה והסביבה",
    desc: "צפויות רוחות חזקות במיוחד בשעות הקרובות. מומלץ להימנע משהייה ממושכת ליד עצים או חפצים לא מקובעים."
  }
];
}

// Search API //
async function getCitySuggestions(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&countrycodes=il`;

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "he"
    }
  });

  if (!response.ok) return [];

  const data = await response.json();

  const mapped = data.map((item) => {
    const address = item.address || {};

    const mainName =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      item.name ||
      item.display_name;

    const region =
      address.state ||
      address.region ||
      address.county ||
      "";

    const country = address.country || "";

    return {
      name: mainName,
      displayName: item.display_name,
      region,
      country,
      lat: Number(item.lat),
      lon: Number(item.lon)
    };
  });

  const unique = mapped.filter((item, index, arr) => {
    return index === arr.findIndex((city) => city.name === item.name);
  });

  return unique.slice(0, 6);
}

async function reverseGeocode(lat, lon) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        "Accept-Language": "he"
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address || {};

    return (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      data.name ||
      null
    );
  } catch (error) {
    return null;
  }
}

// Data Builder //
function buildAppData(rawData, cityLabel = "המיקום שבחרת", alerts = []) {
  const todaySunrise = rawData.daily.sunrise[0];
  const todaySunset = rawData.daily.sunset[0];
  const currentCode = mapOpenMeteoCodeToAppCode(rawData.current.weather_code);

  const hourly = rawData.hourly.time.map((time, index) => {
    const itemIsDay = getIsDayFromTime(time, todaySunrise, todaySunset);

    return {
  time,
  time_epoch: Math.floor(new Date(time).getTime() / 1000),
  temp_c: rawData.hourly.temperature_2m[index],
  chance_of_rain: rawData.hourly.precipitation_probability?.[index] ?? 0,
  will_it_rain: (rawData.hourly.precipitation_probability?.[index] ?? 0) >= 50 ? 1 : 0,
  uv_index: rawData.hourly.uv_index?.[index] ?? 0,
  wind_kph: rawData.hourly.wind_speed_10m?.[index] ?? 0,
  gust_kph: rawData.hourly.wind_gusts_10m?.[index] ?? 0,
  visibility_km: rawData.hourly.visibility?.[index] ? rawData.hourly.visibility[index] / 1000 : null,
  is_day: itemIsDay,
  condition: {
    code: mapOpenMeteoCodeToAppCode(rawData.hourly.weather_code[index])
  }
};
  });

  return {
    location: {
      name: cityLabel,
      localtime_epoch: Math.floor(new Date(rawData.current.time).getTime() / 1000)
    },
    current: {
  temp_c: rawData.current.temperature_2m,
  feelslike_c: rawData.current.apparent_temperature,
  humidity: rawData.current.relative_humidity_2m,
  uv_index: rawData.current.uv_index,
  visibility_km: rawData.current.visibility ? rawData.current.visibility / 1000 : null,
  is_day: rawData.current.is_day,
  wind_kph: rawData.current.wind_speed_10m,
  gust_kph: rawData.current.wind_gusts_10m,
  wind_dir: rawData.current.wind_direction_10m,
  condition: {
    code: currentCode
  }
},
    forecast: {
      forecastday: rawData.daily.time.map((date, index) => ({
        date,
        astro: {
          sunrise: rawData.daily.sunrise[index],
          sunset: rawData.daily.sunset[index]
        },
        day: {
          maxtemp_c: rawData.daily.temperature_2m_max[index],
          mintemp_c: rawData.daily.temperature_2m_min[index],
          daily_chance_of_rain: rawData.daily.precipitation_probability_max?.[index] ?? 0,
          uv_index_max: rawData.daily.uv_index_max?.[index] ?? 0,
          condition: {
            code: mapOpenMeteoCodeToAppCode(rawData.daily.weather_code[index])
          }
        },
        hour: hourly.filter((hourItem) => hourItem.time.startsWith(date))
      }))
    },
    alerts: {
      alert: alerts
    }
  };
}

// Alerts Fallback //
function buildSmartFallbackAlerts(data) {
  const alerts = [];
  const now = new Date();
  const expires = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const current = data.current;
  const today = data.forecast.forecastday[0];
  const nextHours = (today?.hour || []).filter(
    (item) => item.time_epoch >= data.location.localtime_epoch
  );

  const maxUpcomingGust = Math.max(
    current.gust_kph || 0,
    ...nextHours.map((item) => Number(item.gust_kph || 0))
  );

  const minUpcomingVisibility = Math.min(
    current.visibility_km ?? 999,
    ...nextHours
      .map((item) => item.visibility_km)
      .filter((value) => value !== null && value !== undefined)
  );

  const maxTempToday = Math.round(today?.day?.maxtemp_c ?? current.temp_c);
  const rainChanceToday = Math.round(today?.day?.daily_chance_of_rain ?? 0);
  const currentCode = current.condition.code;

  if (maxUpcomingGust >= 50) {
    alerts.push({
      headline: "התרעת רוחות חזקות",
      severity: maxUpcomingGust >= 70 ? "Severe" : "Moderate",
      effective: now.toISOString(),
      expires,
      areas: translateCityName(data.location.name),
      desc: `צפויים משבי רוח חזקים עד כ-${Math.round(maxUpcomingGust)} קמ״ש בשעות הקרובות. מומלץ להיזהר מחפצים לא מקובעים ומשהייה מיותרת בחוץ.`
    });
  }

  if (minUpcomingVisibility <= 2) {
    alerts.push({
      headline: "התרעת ראות נמוכה",
      severity: minUpcomingVisibility <= 1 ? "Severe" : "Moderate",
      effective: now.toISOString(),
      expires,
      areas: translateCityName(data.location.name),
      desc: `הראות עשויה לרדת עד כ-${Math.round(minUpcomingVisibility)} ק״מ. מומלץ לנהוג בזהירות ולהפעיל אורות לפי הצורך.`
    });
  }

  if (maxTempToday >= 34) {
    alerts.push({
      headline: "התרעת עומס חום",
      severity: maxTempToday >= 38 ? "Severe" : "Moderate",
      effective: now.toISOString(),
      expires,
      areas: translateCityName(data.location.name),
      desc: `הטמפרטורה צפויה להגיע לכ-${maxTempToday}°. מומלץ לצמצם חשיפה לשמש, לשתות מים ולהימנע ממאמץ בשעות החמות.`
    });
  }

  if ([1087, 1273, 1276, 1279, 1282].includes(currentCode) || rainChanceToday >= 85) {
    alerts.push({
      headline: "התרעת מזג אוויר סוער",
      severity: "Moderate",
      effective: now.toISOString(),
      expires,
      areas: translateCityName(data.location.name),
      desc: "קיים סיכוי גבוה לגשם משמעותי או תנאי סערה בשעות הקרובות. מומלץ להתעדכן ולהיערך בהתאם."
    });
  }

  return alerts;
}
// Extra Stats //
function getUvLevelText(uv) {
  if (uv <= 2) return "נמוך";
  if (uv <= 5) return "בינוני";
  if (uv <= 7) return "גבוה";
  if (uv <= 10) return "גבוה מאוד";
  return "קיצוני";
}

function updateExtraStats(data) {
  if (!extraStatsBox) return;

  const today = data.forecast.forecastday[0];
  const humidity = Math.round(data.current.humidity ?? 0);
  const feelsLike = Math.round(data.current.feelslike_c ?? data.current.temp_c);
  const rainChance = Math.round(today.day.daily_chance_of_rain ?? 0);
  const visibility = data.current.visibility_km !== null
    ? `${Math.round(data.current.visibility_km)} ק״מ`
    : "—";
  const sunrise = today.astro?.sunrise ? formatTimeShort(today.astro.sunrise) : "--:--";
  const sunset = today.astro?.sunset ? formatTimeShort(today.astro.sunset) : "--:--";

  extraStatsBox.innerHTML = `
    <div class="extra-stat-card">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">water_drop</span>
        <span class="extra-stat-label">לחות</span>
      </div>
      <span class="extra-stat-value">${humidity}%</span>
      <span class="extra-stat-sub">רמת לחות נוכחית באוויר</span>
    </div>

    <div class="extra-stat-card">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">rainy</span>
        <span class="extra-stat-label">סיכוי לגשם</span>
      </div>
      <span class="extra-stat-value">${rainChance}%</span>
      <span class="extra-stat-sub">הסיכוי המרבי להיום</span>
    </div>

    <div class="extra-stat-card">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">device_thermostat</span>
        <span class="extra-stat-label">מרגיש כמו</span>
      </div>
      <span class="extra-stat-value">${feelsLike}°</span>
      <span class="extra-stat-sub">הטמפרטורה המורגשת כרגע</span>
    </div>

    <div class="extra-stat-card">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">visibility</span>
        <span class="extra-stat-label">ראות</span>
      </div>
      <span class="extra-stat-value">${visibility}</span>
      <span class="extra-stat-sub">מרחק הראות הנוכחי</span>
    </div>

    <div class="extra-stat-card">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">wb_twilight</span>
        <span class="extra-stat-label">שקיעה</span>
      </div>
      <span class="extra-stat-value">${sunset}</span>
      <span class="extra-stat-sub">שעת שקיעת השמש</span>
    </div>

    <div class="extra-stat-card">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">light_mode</span>
        <span class="extra-stat-label">זריחה</span>
      </div>
      <span class="extra-stat-value">${sunrise}</span>
      <span class="extra-stat-sub">שעת זריחת השמש</span>
    </div>
  `;
}


// UV Standalone Section //
function updateUvStandalone(data) {
  if (!uvStandaloneBox) return;

  const today = data.forecast.forecastday[0];
  const uvNow = Math.round(data.current.uv_index ?? 0);
  const uvMax = Math.round(today.day.uv_index_max ?? uvNow);

  uvStandaloneBox.innerHTML = `
    <div class="extra-stat-card uv-stat-card" id="uvCard">
      <div class="extra-stat-top">
        <span class="material-symbols-outlined extra-stat-icon">wb_sunny</span>
        <span class="extra-stat-label">UV Index</span>
      </div>
      <span class="extra-stat-value">${uvNow}</span>
      <span class="extra-stat-sub">שיא יומי: ${uvMax} · ${getUvLevelText(uvNow)}</span>
    </div>
  `;

  const uvCard = document.getElementById("uvCard");
  if (uvCard) {
    uvCard.addEventListener("click", openUvModal);
  }
}

function bindUvChartHover() {
  if (!uvChartSvg || !uvChartTooltip || !uvChartBox) return;

  const points = uvChartSvg.querySelectorAll(".uv-chart-point");

  points.forEach((point) => {
    point.addEventListener("mouseenter", () => {
      const x = Number(point.dataset.x);
      const y = Number(point.dataset.y);
      const value = point.dataset.value;
      const label = point.dataset.label;

      point.setAttribute("r", "7");

      uvChartTooltip.innerHTML = `${label}<br>${value}`;
      uvChartTooltip.style.left = `${x}px`;
      uvChartTooltip.style.top = `${y}px`;
      uvChartTooltip.classList.add("show");
    });

    point.addEventListener("mouseleave", () => {
      point.setAttribute("r", "5");
      uvChartTooltip.classList.remove("show");
    });
  });
}

// Theme //
function updateTheme(data) {
  const isDay = data.current.is_day === 1;

  document.body.classList.toggle("day-mode", isDay);
  document.body.classList.toggle("night-mode", !isDay);

  if (sunsetNote) {
    const sunsetValue = data.forecast.forecastday[0]?.astro?.sunset;

    if (sunsetValue) {
      const sunsetTime = new Date(sunsetValue);
      sunsetNote.textContent = `שקיעה: ${sunsetTime.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
    } else {
      sunsetNote.textContent = "שקיעה: --:--";
    }
  }
}

function updateWeatherBackground(data) {
  const currentCode = data.current.condition.code;

  document.body.classList.remove(
    "weather-clear",
    "weather-cloudy",
    "weather-rainy",
    "weather-foggy",
    "weather-stormy"
  );

  if ([1000, 1003].includes(currentCode)) {
    document.body.classList.add("weather-clear");
  } else if ([1006, 1009].includes(currentCode)) {
    document.body.classList.add("weather-cloudy");
  } else if ([1030, 1135, 1147].includes(currentCode)) {
    document.body.classList.add("weather-foggy");
  } else if ([1087, 1273, 1276, 1279, 1282].includes(currentCode)) {
    document.body.classList.add("weather-stormy");
  } else if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(currentCode)) {
    document.body.classList.add("weather-rainy");
  } else {
    document.body.classList.add("weather-clear");
  }
}

// Hero Section //
function updateHero(data) {
  const cityHe = translateCityName(data.location.name);

  cityName.textContent = cityHe;
  mainTemp.textContent = `${Math.round(data.current.temp_c)}°`;
  weatherStatus.textContent = getConditionTextHebrew(data.current.condition.code, data.current.is_day);

  const today = data.forecast.forecastday[0];
  minMaxTemp.textContent = `מקס׳: ${Math.round(today.day.maxtemp_c)}° | מינ׳: ${Math.round(today.day.mintemp_c)}°`;
}

// Summary Section //
function updateSummary(data) {
  if (!summaryText) return;

  const current = data.current;
  const today = data.forecast.forecastday[0];
  const nextHours = today.hour || [];
  const cityHe = translateCityName(data.location.name);

  const currentCode = current.condition.code;
  const currentTextHe = getConditionTextHebrew(currentCode, current.is_day);
  const isDay = current.is_day === 1;

  const nowTemp = Math.round(current.temp_c);
  const feelsLike = Math.round(current.feelslike_c);
  const maxTemp = Math.round(today.day.maxtemp_c);
  const minTemp = Math.round(today.day.mintemp_c);
  const rainChance = Number(today.day.daily_chance_of_rain || 0);
  const wind = Math.round(current.wind_kph || 0);

  const upcomingRain = nextHours.some((hour) => {
    return (
      hour.time_epoch >= data.location.localtime_epoch &&
      (Number(hour.chance_of_rain || 0) >= 50 || hour.will_it_rain === 1)
    );
  });

  let summary = "";

  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(currentCode)) {
    summary = `כרגע יש ${currentTextHe} ב־${cityHe}, עם ${nowTemp}°. מומלץ לצאת עם מטרייה.`;
  } else if ([1087, 1273, 1276, 1279, 1282].includes(currentCode)) {
    summary = `יש תנאי סערה ב־${cityHe}. כרגע ${currentTextHe} ו־${nowTemp}°.`;
  } else if ([1030, 1135, 1147].includes(currentCode)) {
    summary = `כרגע ${currentTextHe} ב־${cityHe}, עם ${nowTemp}°. הראות עשויה להיות נמוכה יותר.`;
  } else if ([1006, 1009].includes(currentCode)) {
    summary = `מעונן ב־${cityHe} עם ${nowTemp}°, והטמפרטורות היום ינועו בין ${minTemp}° ל־${maxTemp}°.`;
  } else if (currentCode === 1003) {
    summary = `מעונן חלקית ב־${cityHe}. כרגע ${nowTemp}°, ומרגיש כמו ${feelsLike}°.`;
  } else if (currentCode === 1000) {
    if (isDay) {
      summary = `מזג האוויר בהיר ונעים ב־${cityHe}, עם ${nowTemp}°. היום הטמפרטורות ינועו בין ${minTemp}° ל־${maxTemp}°.`;
    } else {
      summary = `הלילה בהיר ב־${cityHe}, עם ${nowTemp}° ומזג אוויר נעים יחסית.`;
    }
  } else {
    summary = `כרגע ב־${cityHe} מזג האוויר הוא ${currentTextHe}, הטמפרטורה ${nowTemp}° ומרגיש כמו ${feelsLike}°.`;
  }

  if (upcomingRain && !summary.includes("מטרייה")) {
    summary += " ייתכן גשם בשעות הקרובות.";
  }

  if (rainChance >= 60 && !summary.includes("גשם")) {
    summary += ` סיכוי הגשם היום גבוה ועומד על ${rainChance}%.`;
  }

  if (wind >= 25) {
    summary += ` הרוח מורגשת יחסית עם כ־${wind} קמ״ש.`;
  }

  if (maxTemp >= 30) summary += " צפוי להיות חם בהמשך היום.";
  if (maxTemp <= 15) summary += " צפוי יום קריר יחסית.";

  summaryText.textContent = summary;
}

// Hourly Section //
function updateHourly(data) {
  if (!hourlyContainer) return;

  hourlyContainer.innerHTML = "";

  const nowEpoch = data.location.localtime_epoch;
  const allHours = data.forecast.forecastday.flatMap((day) => day.hour);

  const next24Hours = allHours
    .filter((hour) => hour.time_epoch >= nowEpoch)
    .slice(0, 24);

  const todayAstro = data.forecast.forecastday[0].astro;
  const sunriseHour = new Date(todayAstro.sunrise).getHours();
  const sunsetHour = new Date(todayAstro.sunset).getHours();

  next24Hours.forEach((item, index) => {
    const itemDate = new Date(item.time);
    const itemHour = itemDate.getHours();

    let label = index === 0 ? "כעת" : formatHour(item.time);
    let iconName = normalizeWeatherApiIcon(item.condition.code, item.is_day);
    let iconClass = getIconClass(iconName, item.is_day);

    if (itemHour === sunriseHour) {
      iconName = "wb_sunny";
      iconClass = "sunrise-icon";
      label = "זריחה";
    } else if (itemHour === sunsetHour) {
      iconName = "wb_twilight";
      iconClass = "sunset-icon";
      label = "שקיעה";
    }

    const hourItem = document.createElement("div");
    hourItem.className = "hour-item";

    hourItem.innerHTML = `
      <span class="hour-label">${label}</span>
      <span class="material-symbols-outlined weather-icon ${iconClass}">${iconName}</span>
      <span class="hour-temp">${Math.round(item.temp_c)}°</span>
    `;

    hourlyContainer.appendChild(hourItem);
  });
}

// Hourly Drag //
const slider = document.getElementById("hourlyContainer");

if (slider) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  slider.addEventListener("mousedown", (e) => {
    isDown = true;
    slider.classList.add("dragging");
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener("mouseleave", () => {
    isDown = false;
    slider.classList.remove("dragging");
  });

  slider.addEventListener("mouseup", () => {
    isDown = false;
    slider.classList.remove("dragging");
  });

  slider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();

    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.2;
    slider.scrollLeft = scrollLeft - walk;
  });
}

// Daily Section //
function updateDaily(data) {
  if (!dailyContainer) return;

  dailyContainer.innerHTML = "";

  data.forecast.forecastday.forEach((item, index) => {
    const iconName = normalizeWeatherApiIcon(item.day.condition.code, 1);
    const iconClass = getIconClass(iconName, 1);

    const dayName = getDayName(item.date, index);
    const min = Math.round(item.day.mintemp_c);
    const max = Math.round(item.day.maxtemp_c);
    const width = Math.max(25, Math.min(100, (max - min) * 12));

    const row = document.createElement("div");
    row.className = "day-row";

    row.innerHTML = `
      <div class="day-info">
        <span class="day-name">${dayName}</span>
        <span class="material-symbols-outlined weather-icon ${iconClass}">${iconName}</span>
      </div>

      <div class="temp-bar">
        <span class="min">${min}°</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
        <span class="max">${max}°</span>
      </div>
    `;

    dailyContainer.appendChild(row);
  });
}

// Wind Section //
function updatePrecipitation(data) {
  if (!precipBox) return;

  const windNow = Math.round(data.current.wind_kph || 0);
  const gustNow = Math.round(data.current.gust_kph || 0);
  const windDir = getWindDirectionHebrew(data.current.wind_dir);

  precipBox.innerHTML = `
    <a
      class="wind-map-full-link"
      href="https://www.ventusky.com/he/%D7%9E%D7%A9%D7%91%D7%99-%D7%A8%D7%95%D7%97-%D7%9E%D7%A4%D7%94/%D7%A9%D7%A2%D7%94-1#p=31.47;34.72;7"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="מעבר למפת רוח"
    >
      <div class="wind-map-box">
        <img
          src="img/wind-map.png"
          alt="מפת רוח"
        />
        <div class="wind-map-hover-overlay">
          <span>מעבר למפת רוח</span>
        </div>
      </div>
    </a>

    <div class="wind-stats-grid">
      <div class="wind-stat-card">
        <span class="wind-stat-label">רוח כרגע</span>
        <span class="wind-stat-value">${windNow}<span class="wind-stat-unit">קמ״ש</span></span>
      </div>

      <div class="wind-stat-card">
        <span class="wind-stat-label">כיוון רוח</span>
        <span class="wind-stat-value" style="font-size:18px;">${windDir}</span>
      </div>

      <div class="wind-stat-card">
        <span class="wind-stat-label">משבים</span>
        <span class="wind-stat-value">${gustNow}<span class="wind-stat-unit">קמ״ש</span></span>
      </div>
    </div>
  `;
}

// Alerts Section //
function getSeverityLabel(severity = "") {
  const value = String(severity).toLowerCase();

  if (value.includes("extreme")) {
    return { text: "קיצוני", className: "extreme" };
  }

  if (value.includes("severe")) {
    return { text: "חמור", className: "severe" };
  }

  if (value.includes("moderate")) {
    return { text: "בינוני", className: "moderate" };
  }

  if (value.includes("minor")) {
    return { text: "קל", className: "minor" };
  }

  return { text: severity || "התרעה", className: "moderate" };
}


function getSeverityLabel(severity = "") {
  const value = String(severity).toLowerCase();

  if (value.includes("extreme")) {
    return { text: "קיצוני", className: "extreme" };
  }

  if (value.includes("severe")) {
    return { text: "חמור", className: "severe" };
  }

  if (value.includes("moderate")) {
    return { text: "בינוני", className: "moderate" };
  }

  if (value.includes("minor")) {
    return { text: "קל", className: "minor" };
  }

  return { text: "התרעה", className: "moderate" };
}

function updateAlerts(data) {
  if (!alertsBox) return;

  const alerts = data?.alerts?.alert || [];

  if (!alerts.length) {
    alertsBox.innerHTML = `
      <div class="alert-empty-clean">
        אין במיקומך התרעות מזג אוויר.
      </div>
    `;
    return;
  }

  alertsBox.innerHTML = alerts.map((alertItem) => {
    const title =
      alertItem.headline ||
      alertItem.event ||
      "התרעת מזג אוויר";

    const severityInfo = getSeverityLabel(alertItem.severity);
    const effective = formatAlertTime(alertItem.effective);
    const expires = formatAlertTime(alertItem.expires);

    const desc =
      alertItem.desc ||
      alertItem.note ||
      alertItem.instruction ||
      "פורסמה התרעת מזג אוויר רשמית לאזור זה.";

    const areas = alertItem.areas
      ? `<div class="alert-meta-clean">אזור: ${alertItem.areas}</div>`
      : "";

    return `
      <article class="alert-card-clean">
        <div class="alert-top-row">
          <h3 class="alert-title-clean">${title}</h3>
          <span class="alert-badge ${severityInfo.className}">${severityInfo.text}</span>
        </div>

        <div class="alert-meta-clean">בתוקף מ־${effective}</div>
        <div class="alert-meta-clean">עד ${expires}</div>
        ${areas}
        <p class="alert-desc-clean">${desc}</p>
      </article>
    `;
  }).join("");
}

// UV Modal //
function getUvAdvice(uv) {
  if (uv <= 2) return "רמות נמוכות כעת. אין צורך מיוחד בהגנה מעבר לשגרה.";
  if (uv <= 5) return "רמת קרינה בינונית. מומלץ להשתמש בקרם הגנה אם את בחוץ לזמן ממושך.";
  if (uv <= 7) return "רמת קרינה גבוהה. מומלץ קרם הגנה, משקפי שמש והעדפה לצל.";
  if (uv <= 10) return "רמת קרינה גבוהה מאוד. כדאי לצמצם חשיפה ישירה לשמש בשעות השיא.";
  return "רמת קרינה קיצונית. מומלץ להימנע מחשיפה ישירה לשמש ככל האפשר.";
}

function getUvModalDescription(uvNow) {
  return `כרגע מדד ה־UV הוא ${uvNow}, ברמה ${getUvLevelText(uvNow)}.`;
}

function getUvColor(value) {
  if (value <= 2) return "#34c759";
  if (value <= 5) return "#ffd60a";
  if (value <= 7) return "#ff9f0a";
  if (value <= 10) return "#ff375f";
  return "#bf5af2";
}

function buildUvGradientStops(values) {
  if (!values.length) return "";

  return values
    .map((value, index) => {
      const offset = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      return `<stop offset="${offset}%" stop-color="${getUvColor(value)}" />`;
    })
    .join("");
}

function openUvModal() {
  if (!uvModal || !lastWeatherData) return;

  const uvNow = Math.round(lastWeatherData.current.uv_index ?? 0);

  uvModalValue.textContent = uvNow;
  uvModalLevel.textContent = getUvLevelText(uvNow);
  uvModalDesc.textContent = getUvModalDescription(uvNow);
  uvModalAdvice.textContent = getUvAdvice(uvNow);

  renderUvChart(lastWeatherData);
  bindUvChartHover();

  uvModal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeUvModal() {
  if (!uvModal) return;
  uvModal.classList.remove("show");
  document.body.style.overflow = "";
}

function renderUvChart(data) {
  if (!uvChartSvg || !uvChartHours) return;

  const today = data.forecast.forecastday[0];
  const todayHours = today.hour || [];

  const daylightHours = todayHours.filter((item) => item.is_day === 1);
  const chartData = daylightHours.length ? daylightHours : todayHours.slice(0, 12);

  const values = chartData.map((item) => Number(item.uv_index ?? 0));
  const labels = chartData.map((item) => formatHour(item.time));

  const width = 340;
  const height = 180;
  const paddingX = 22;
  const paddingTop = 14;
  const paddingBottom = 18;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const maxValue = Math.max(12, ...values, 1);

  const points = values.map((value, index) => {
    const x = paddingX + index * (chartWidth / Math.max(values.length - 1, 1));
    const y = paddingTop + chartHeight - (value / maxValue) * chartHeight;

    return {
      x,
      y,
      value,
      label: labels[index]
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1]?.x || paddingX} ${height - paddingBottom}
    L ${points[0]?.x || paddingX} ${height - paddingBottom}
    Z
  `;

  const gradientId = "uvLineGradient";
  const areaGradientId = "uvAreaGradient";

  uvChartSvg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
        ${buildUvGradientStops(values)}
      </linearGradient>

      <linearGradient id="${areaGradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
      </linearGradient>
    </defs>

    <path d="${areaPath}" fill="url(#${areaGradientId})"></path>

    <path
      d="${linePath}"
      fill="none"
      stroke="url(#${gradientId})"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></path>

    ${points
      .map((point) => {
        return `
          <circle
            class="uv-chart-point"
            cx="${point.x}"
            cy="${point.y}"
            r="5"
            fill="${getUvColor(point.value)}"
            data-x="${point.x}"
            data-y="${point.y}"
            data-value="${point.value}"
            data-label="${point.label}"
          ></circle>
        `;
      })
      .join("")}
  `;

  uvChartHours.innerHTML = labels
    .map((label) => `<span>${label}</span>`)
    .join("");

  uvChartState = points;
}

function bindUvChartHover() {
  if (!uvChartSvg || !uvChartTooltip || !uvChartBox) return;

  const points = uvChartSvg.querySelectorAll(".uv-chart-point");

  points.forEach((point) => {
    point.addEventListener("mouseenter", () => {
      const x = Number(point.dataset.x);
      const y = Number(point.dataset.y);
      const value = point.dataset.value;
      const label = point.dataset.label;

      uvChartTooltip.innerHTML = `${label}<br>${value}`;
      uvChartTooltip.style.left = `${x}px`;
      uvChartTooltip.style.top = `${y}px`;
      uvChartTooltip.classList.add("show");
    });

    point.addEventListener("mouseleave", () => {
      uvChartTooltip.classList.remove("show");
    });
  });
}

// Main Weather Loader //
async function getWeatherByCoords(lat, lon, cityLabel = null) {
  try {
    const rawData = await getForecast(lat, lon);

    let finalCity = cityLabel;
    if (!finalCity) {
      finalCity = await reverseGeocode(lat, lon);
    }

    finalCity = translateCityName(finalCity || "המיקום שבחרת");

    const tempData = buildAppData(rawData, finalCity, []);
    let liveAlerts = await getWeatherAlerts(lat, lon).catch(() => []);

    if (!liveAlerts.length) {
      liveAlerts = buildSmartFallbackAlerts(tempData);
    }

    const data = buildAppData(rawData, finalCity, liveAlerts);

    lastWeatherData = data;
    currentCity = finalCity;

    updateHero(data);
    updateTheme(data);
    updateWeatherBackground(data);
    updateSummary(data);
    updateHourly(data);
    updateDaily(data);
    updateExtraStats(data);
    updateUvStandalone(data);
    updatePrecipitation(data);
    updateAlerts(data);
  } catch (error) {
    console.error("שגיאה:", error);
    alert(error.message || "לא הצלחתי לטעון את מזג האוויר.");
  }
}

// Suggestions //
function hideSuggestions() {
  suggestions = [];
  activeSuggestionIndex = -1;

  if (suggestionsBox) {
    suggestionsBox.innerHTML = "";
    suggestionsBox.classList.remove("show");
  }
}

function renderSuggestions(items) {
  if (!suggestionsBox) return;

  if (!items.length) {
    hideSuggestions();
    return;
  }

  suggestionsBox.innerHTML = "";
  suggestionsBox.classList.add("show");

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion-item";

    if (index === activeSuggestionIndex) {
      btn.classList.add("active");
    }

    const cityNameHe = translateCityName(item.name || "");
    const regionParts = [];

    if (item.region && item.region !== cityNameHe) {
      regionParts.push(item.region);
    }

    if (item.country && item.country !== "ישראל") {
      regionParts.push(item.country);
    } else {
      regionParts.push("ישראל");
    }

    const subLabel = regionParts.join(", ");

    btn.innerHTML = `
      <div class="suggestion-row">
        <span class="suggestion-pin">📍</span>
        <div class="suggestion-text">
          <span class="suggestion-main">${cityNameHe}</span>
          <span class="suggestion-sub">${subLabel}</span>
        </div>
      </div>
    `;

    btn.addEventListener("click", () => {
      chooseSuggestion(item);
    });

    suggestionsBox.appendChild(btn);
  });
}

function chooseSuggestion(item) {
  didUserSearch = true;
  searchInput.value = translateCityName(item.name);
  hideSuggestions();
  getWeatherByCoords(item.lat, item.lon, item.name);
  searchInput.blur();
}

async function fetchAndShowSuggestions(query) {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    hideSuggestions();
    return;
  }

  try {
    const items = await getCitySuggestions(trimmed);
    suggestions = items;
    activeSuggestionIndex = -1;
    renderSuggestions(suggestions);
  } catch (error) {
    console.error("שגיאה בקבלת הצעות ערים:", error);
    hideSuggestions();
  }
}

// Modal Events //
if (uvModalClose) {
  uvModalClose.addEventListener("click", closeUvModal);
}

if (uvModalBackdrop) {
  uvModalBackdrop.addEventListener("click", closeUvModal);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeUvModal();
  }
});

// Search Events //
if (searchInput) {
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      fetchAndShowSuggestions(searchInput.value);
    }, 300);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (!suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
      renderSuggestions(suggestions);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
      renderSuggestions(suggestions);
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (activeSuggestionIndex >= 0) {
        chooseSuggestion(suggestions[activeSuggestionIndex]);
      } else if (suggestions[0]) {
        chooseSuggestion(suggestions[0]);
      }
    }

    if (event.key === "Escape") {
      hideSuggestions();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box")) {
      hideSuggestions();
    }
  });
}

// User Location //
function getUserLocationWeather() {
  if (!navigator.geolocation) {
    getWeatherByCoords(32.7940, 34.9896, "Haifa");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      getWeatherByCoords(latitude, longitude);
    },
    () => {
      getWeatherByCoords(32.7940, 34.9896, "Haifa");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Init //
getUserLocationWeather();