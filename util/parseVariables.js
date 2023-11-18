module.exports = (variableRegex = /{([^}]+)}/g, variables, string) => {
    const output = {
        processed: string.replace(variableRegex, (match, key) => variables[key] !== undefined && variables[key] || match),
    };

    output.missing = output.processed.match(variableRegex).length;

    return output;
}