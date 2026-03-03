const amqp = require('amqplib');
const { logger } = require('../utils/logger');
let channel = null;
const Queue_name = "click_analytics";

const connectRabbitmq = async ()=>{
    if(channel) return channel;
    const connection = await amqp.connect(process.env.AMQP_URL);
    channel = await connection.createChannel();
     await channel.assertQueue(Queue_name,{
        durable:true
    });
    logger.info({
        message:"redis connected"
    })
    return channel;
}

const publishToQueue= async (message)=>{
    const ch = await connectRabbitmq();
    
    const binaryMessage = Buffer.from(JSON.stringify(message));
    ch.sendToQueue(Queue_name ,  binaryMessage , {persistent : true});
}

module.exports = { connectRabbitmq ,publishToQueue , Queue_name} ; 