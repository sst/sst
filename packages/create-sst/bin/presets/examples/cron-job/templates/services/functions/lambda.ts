import fetch from "node-fetch";

export async function main() {
  const weather = await checkSFWeather();
  console.log(weather.consolidated_weather[0]);
  return {};
}

function checkSFWeather() {
  return fetch("https://www.metaweather.com/api/location/2487956/").then(
    (res) => res.json()
  );
}
