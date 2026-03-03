const db = require('../utils/db');
const crypto = require('crypto');
const { handleDbError } = require('../utils/dbErrorHandler');
const { logger } = require('../utils/logger');
const redis = require('../config/redis.config');



exports.generateUrl = async (targetUrl, expiresAt) => {
    const code = crypto.randomBytes(4).toString('hex');
    const expiresAtValue = expiresAt ? expiresAt : null
    try {
        const url = await db.url.create({
            data: {
                targetUrl,
                expiresAt: expiresAtValue,
                code
            }
        });

        return url;
    }
    catch (err) {
        throw handleDbError(err);
    }
}

exports.getTargetUrlFromCode = async (code) => {
    const cacheKey = `short_${code}`;
    try {
        const cached = await redis.get(cacheKey);
        if(cached){
            logger.info({ event: "cache_hit" });
            const data = JSON.parse(cached);
            return data.targetUrl;
        }
        logger.info({ event: "cache_miss" });
        const url = await db.url.findFirst({
            where: {
                code,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });
        console.log({url});

        if (!url) return null;
        const ttl = url.expiresAt ? url.expiresAt - Math.floor((new Date(url.expiresAt) - Date.now()) / 1000) : 86400;
        await redis.set(cacheKey,JSON.stringify(url),{
            EX:ttl
        });

        return url?.targetUrl;
    }
    catch (err) {
        logger.error({
            event: "redirect_error",
            message: err.message,
            code,
            stack: err.stack
        });
        throw handleDbError(err);
    }
}