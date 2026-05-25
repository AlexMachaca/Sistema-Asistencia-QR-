const sendResponse = (res, statusCode, isSuccess, data, messages = []) => {
    return res.status(statusCode).json({
        statusCode,
        isSuccess,
        data,
        messages
    });
};

module.exports = {
    sendResponse
};