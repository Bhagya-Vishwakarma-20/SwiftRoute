require('newrelic');

const express = require('express');
const cors = require('cors');
const cookieParser =  require('cookie-parser')


const  routes =require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();
require('dotenv').config();

app.use(cors());
app.set("trust proxy", true);
app.use(cookieParser())
app.use(express.json({urlencoded:true}));

app.use('/health',(req,res)=>{
    res.json({status:ok});
})
app.use('/',routes);

app.use(notFoundHandler);

app.use(errorHandler);

app.listen(3000);