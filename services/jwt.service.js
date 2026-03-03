const db = require('../utils/db');
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;

exports.generateAccessToken = (user) => {
    const payload = {
        id: user.id,    
        username: user.username
    }
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });    
    return token;
}

exports.generateRefreshToken = (user) => {  
    const payload = {
        id: user.id,    
        username: user.username     
    }   
    const token = jwt.sign(payload, secretKey, { expiresIn: '7d' });    
    return token;
}

exports.saveTokenToDb = async(token) =>{
    const savedToken = await db.token.create({
        data: {
            token   
        }
    });
    return savedToken;  
} 

exports.deleteTokenFromDb = async(token) =>{
        const deletedToken = await db.token.delete({
            where: {    
                token
            }
        });
    
    return deletedToken;  
}   