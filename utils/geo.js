const geoip = require("geoip-lite");
const requestIp = require("request-ip");

async function  getGeoData(req) {
  const ip =  await requestIp.getClientIp(req);

  if (!ip) {
    return {
      ip: null,
      country: null,
    };
  }

  const geo = await geoip.lookup(ip);

  return {
    ip,
    country:geo?.country ? geo.country : "India",
  };
}

module.exports = {
  getGeoData,
};