const db = require('../utils/db');
exports.findUserByUsername = async (username) => {
    const user = await db.user.findFirst(
        {
            where: {
                username
            }
        }
    );
    return user;
}

exports.createUser = async (username, hashedPassword)=>{
    const user = await db.user.create({
        data: {
            username
            , password: hashedPassword
        }
    });
    return user ;
}