const geoip = require('geoip-lite');
const requestIp = require('request-ip');
const { getGeoData } = require('../../utils/geo');

jest.mock('geoip-lite');
jest.mock('request-ip');

describe('geo utility', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return ip and country when both are available', async () => {
    requestIp.getClientIp.mockReturnValue('8.8.8.8');
    geoip.lookup.mockReturnValue({ country: 'US' });

    const result = await getGeoData({});
    expect(result).toEqual({ ip: '8.8.8.8', country: 'US', region: null, city: null, latitude: null, longitude: null, timezone: null, accuracyRadius: null });
  });

  it('should return full city-level location when lookup has it', async () => {
    requestIp.getClientIp.mockReturnValue('8.8.8.8');
    geoip.lookup.mockReturnValue({
      country: 'US', region: 'CA', city: 'Mountain View',
      ll: [37.386, -122.0838], timezone: 'America/Los_Angeles', area: 1000,
    });

    const result = await getGeoData({});
    expect(result).toEqual({
      ip: '8.8.8.8', country: 'US', region: 'CA', city: 'Mountain View',
      latitude: 37.386, longitude: -122.0838,
      timezone: 'America/Los_Angeles', accuracyRadius: 1000,
    });
  });

  it('should convert empty strings to null', async () => {
    requestIp.getClientIp.mockReturnValue('8.8.8.8');
    geoip.lookup.mockReturnValue({ country: 'US', region: '', city: '', ll: [0, 0], timezone: '', area: 0 });

    const result = await getGeoData({});
    expect(result).toEqual({
      ip: '8.8.8.8', country: 'US', region: null, city: null,
      latitude: 0, longitude: 0, timezone: null, accuracyRadius: 0,
    });
  });

  it('should default country to India when geoip lookup fails', async () => {
    requestIp.getClientIp.mockReturnValue('192.168.1.1');
    geoip.lookup.mockReturnValue(null);

    const result = await getGeoData({});
    expect(result).toEqual({ ip: '192.168.1.1', country: 'India', region: null, city: null, latitude: null, longitude: null, timezone: null, accuracyRadius: null });
  });

  it('should return null ip and country when IP is not found', async () => {
    requestIp.getClientIp.mockReturnValue(null);

    const result = await getGeoData({});
    expect(result).toEqual({ ip: null, country: null, region: null, city: null, latitude: null, longitude: null, timezone: null, accuracyRadius: null });
    expect(geoip.lookup).not.toHaveBeenCalled();
  });
});
