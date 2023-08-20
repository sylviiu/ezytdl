module.exports = {
    type: `handle`,
    func: (event, [name, content]) => {
        console.log(`Config request`)

        if(name) {
            return require(`../../../../util/configs`)[name](content);
        } else return require(`../../../../getConfig`)(content);

        /*const latestConfig = require(`../../../getConfig`)(content);
    
        console.log(`Sending UPDATED config`, latestConfig)

        return latestConfig;*/
    }
}