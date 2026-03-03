const winston = require('winston');
const format = winston.format.combine(
    winston.format.errors({stack:true}),
    winston.format.prettyPrint()
)
const transports = [
        new winston.transports.File({
        filename:'errors.log',level:'error'
        }),
        new winston.transports.File({
            filename:'combined.log'
        }),
        new winston.transports.Console()
    ]

module.exports = { format  , transports}