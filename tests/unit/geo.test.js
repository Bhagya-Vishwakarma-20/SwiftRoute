const geoip = require('geoip-lite');
const requestIp = require('request-ip');
const { getGeoData } = require('../../utils/geo');

jest.mock('geoip-lite');
jest.mock('request-ip');

describe('geo utility', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return ip and country when both are available', () => {
    requestIp.getClientIp.mockReturnValue('8.8.8.8');
    geoip.lookup.mockReturnValue({ country: 'US' });

    const result = getGeoData({});
    expect(result).toEqual({ ip: '8.8.8.8', country: 'US' });
  });

  it('should return null country when geoip lookup fails', () => {
    requestIp.getClientIp.mockReturnValue('192.168.1.1');
    geoip.lookup.mockReturnValue(null);

    const result = getGeoData({});
    expect(result).toEqual({ ip: '192.168.1.1', country: null });
  });

  it('should return null ip and country when IP is not found', () => {
    requestIp.getClientIp.mockReturnValue(null);

    const result = getGeoData({});
    expect(result).toEqual({ ip: null, country: null });
    expect(geoip.lookup).not.toHaveBeenCalled();
  });
});
