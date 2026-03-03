const {publishToQueue} = require('../lib/rabbitmq');

const publishClickEvents =  async ( ClickEventData ) =>{
    try{
        await  publishToQueue(ClickEventData);
    } 
    catch(err){
        const Err = new Error(err.message);
        throw Err;
    }
}

module.exports = {
    publishClickEvents
}