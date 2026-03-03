
const handleDbError = (err) => {
    const prismaErrors = {
        'P2002': { statusCode: 409, message: 'Unique constraint failed' },
        'P2025': { statusCode: 404, message: 'Record not found' },
        'P2003': { statusCode: 400, message: 'Foreign key constraint failed' },
        'P2014': { statusCode: 400, message: 'Required relation violation' },
        'P2012': { statusCode: 400, message: 'Missing required field' },
        'P2023': { statusCode: 400, message: 'Inconsistent column data' },
    };

    if (err.code && prismaErrors[err.code]) {
        err.statusCode = prismaErrors[err.code].statusCode;
        err.message = prismaErrors[err.code].message;
    } else {
        err.statusCode = 500;
    }

    return err;
};

module.exports = { handleDbError };
