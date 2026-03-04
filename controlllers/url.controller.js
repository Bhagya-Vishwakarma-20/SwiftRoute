const { generateUrl, getTargetUrlFromCode } = require('../services/url.service')
const { logger } = require('../utils/logger');
const {publishClickEvents} = require('../services/analytics.service')
const {getGeoData} = require('../utils/geo');
const  handleClickEvent = async (req, link)=> {
  const { ip, country } = getGeoData(req);

  const clickData = {
    linkId: link,
    ip,
    country,
    userAgent: req.headers["user-agent"] || null,
    referrer: req.headers["referer"] || null,
    timestamp: new Date(),
  };

  publishClickEvents(clickData);
}

exports.generateUrl = async (req, res) => {
    const { url, expiry } = req.body;
    if (!url) {
        return res.status(400).json({ message: "url is required" });
    }
    
    const data = await generateUrl(url, expiry);
    if (!data) {
        logger.error({
            event: "url_creation_failed",
            reason: null,
            code: data.code,
            ip: req.ip
        });
        const err = new Error('Cannot Process your request')
        err.statusCode = 442;
        throw err;
    }
    
    const newUrl = `${req.protocol}://${req.get('host')}/url/${data.code}`;
    
    const expiresAt = data.expiresAt ? data.expiresAt : 'Never';
    logger.info({
        event: "link_created",
        code: data.code,
        target: url,
        ip: req.ip
    });

    return res.json({
        newUrl,
        expiresAt
    })
}

exports.redirectCodedUrl = async (req, res) => {
    const start = performance.now();
    const { code } = req.params;
    const url = await getTargetUrlFromCode(code);
    if (!url) {
        logger.warn({
            event: "redirect_blocked",
            reason: "expired_or_inactive",
            code,
            ip: req.ip
        });
        const err = new Error('Invalid url or expired')
        err.statusCode = 404;
        throw err;
    }

    const latencyMs = performance.now() - start;

    logger.info({
        event: "redirect_success",
        code,
        target: url,
        latency: latencyMs,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    });
    handleClickEvent(req,url);
    res.redirect(url);
}
