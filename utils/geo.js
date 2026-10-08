const geoip = require("geoip-lite");
const requestIp = require("request-ip");

const orNull = (v) => (v === undefined || v === null || v === "" ? null : v);

const EMPTY_LOCATION = {
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null,
  accuracyRadius: null,
};

async function  getGeoData(req) {
  const ip =  await requestIp.getClientIp(req);

  if (!ip) {
    return {
      ip: null,
      country: null,
      ...EMPTY_LOCATION,
    };
  }

  const geo = await geoip.lookup(ip);

  return {
    ip,
    country:geo?.country ? geo.country : "India",
    region: orNull(geo?.region),
    city: orNull(geo?.city),
    latitude: orNull(geo?.ll?.[0]),
    longitude: orNull(geo?.ll?.[1]),
    timezone: orNull(geo?.timezone),
    accuracyRadius: orNull(geo?.area),
  };
}

module.exports = {
  getGeoData,
};