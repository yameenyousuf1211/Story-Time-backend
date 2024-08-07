class ErrorHandling {
    static notFound(req, res, next) {
        const error = new Error(`Not Found - ${req.originalUrl}`);
        res.status(404);
        next(error);
    }

    static errorHandler(err, req, res, next) {
        const statusCode = err?.statusCode ? err?.statusCode : 500;
        const error = new Error(err?.message.replace(/\"/g, '') || 'Internal Server Error');

        return res.status(statusCode).json({
            message: error?.message,
            statusCode: statusCode,
            stack: error?.stack,
        });
    }
}

module.exports = ErrorHandling;