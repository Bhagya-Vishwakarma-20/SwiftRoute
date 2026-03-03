const jwt  =require('jsonwebtoken');

const authMiddleware = (req,res,next)=>{
    try{

        const token = req.headers.authorization.split(' ')[1];
        if(!token)res.status(401).send("No Token Found");
        try{
            const user = jwt.verify(token,process.env.JWT_SECRET);
            req.user = user;
            next();
        }
        catch(error){
            res.status(403).send("Invalid Token");
        }
    }
    catch(err){
            res.status(401).send("Unauthorized");

    }
}
module.exports = authMiddleware;