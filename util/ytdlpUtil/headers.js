module.exports = {
    filter: [`Accept-Language`, `User-Agent`, `Referer`, `Cookie`],
    filterHeaders: (headers={}, filter=module.exports.filter) => {
        const newHeaders = {};

        Object.keys(headers).forEach(key => {
            if(filter.includes(key)) newHeaders[key] = headers[key];
        });

        return newHeaders;
    }
}