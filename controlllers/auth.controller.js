const db = require('../utils/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const  {findUserByUsername , createUser}= require('../services/user.service');
const {generateAccessToken, generateRefreshToken , saveTokenToDb , deleteTokenFromDb} = require('../services/jwt.service');
const { ref } = require('process');


exports.signup = async (req,res)=>{
        const {username,password} = req.body;
        const hashedPassword = await bcrypt.hash(password,10);
        const user = await createUser(username,hashedPassword);
        return res.json(user);
}

exports.signin = async (req,res)=>{
        const {username,password} = req.body;
        const user = await findUserByUsername(username);
        const isPasswordValid = await bcrypt.compare(password,user.password);
        if(! isPasswordValid)  res.status(401).send("Invalid credentials");
        const acessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await saveTokenToDb(refreshToken);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        return res.json({
            accessToken: acessToken,
        });
}

exports.refreshToken = async (req,res)=>{   
    const refreshToken = req.cookies?.refreshToken;
    if(!refreshToken) return res.status(401).send("No refresh token provided");
    const tokenInDb = await db.token.findFirst({where:{token:refreshToken}});
    if(!tokenInDb) return res.status(403).send("Invalid refresh token");
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        console.log(decoded);
        const user = await findUserByUsername(decoded.username);
        console.log({user});
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        await deleteTokenFromDb(refreshToken);
        await saveTokenToDb(newRefreshToken);
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        return res.json({
            accessToken: newAccessToken,
        });
    }
    catch (err) {   
        console.log(err);
        return res.status(403).send("Invalid refresh token");
    }
}