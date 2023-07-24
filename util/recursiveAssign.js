module.exports = (source, ...objects) => {
    const parseObj = (obj, newObj) => {
        for(const [key, value] of Object.entries(newObj)) {
            if(value && typeof value == `object` && !Array.isArray(value)) {
                obj[key] = parseObj(obj[key] || {}, value);
            } else if(value) obj[key] = value;
        };

        return obj;
    };

    for(const obj of objects) {
        source = parseObj(source, obj);
    };

    return source;
}