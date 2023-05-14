module.exports = {
    type: `handle`,
    func: (event, content) => {
        console.log(`Config request`)
        
        const config = require(`../../../getConfig`)();
        
        const { strings } = config;

        console.log(typeof content)

        const latestConfig = require(`../../../getConfig`)(content);
    
        console.log(`Sending UPDATED config`, latestConfig)

        return latestConfig;
    }
}