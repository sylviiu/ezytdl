module.exports = {
    type: `handle`,
    func: () => {
        console.log(`Config request`)
        
        const config = require(`../../../getConfig`)();

        return config;
    }
}