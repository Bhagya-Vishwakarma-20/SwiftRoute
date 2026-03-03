const geoip = require("geoip-lite");
const requestIp = require("request-ip");

function getGeoData(req) {
  const ip = requestIp.getClientIp(req);

  if (!ip) {
    return {
      ip: null,
      country: null,
    };
  }

  const geo = geoip.lookup(ip);

  return {
    ip,
    country: geo ? geo.country : null,
  };
}

module.exports = {
  getGeoData,
};