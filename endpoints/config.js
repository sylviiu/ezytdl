const { sendNotification } = require("../util/downloadManager");

module.exports = {
    type: `post`,
    path: `/config`,
    func: (req, res) => {
        console.log(`Config request`)
        
        const config = require(`../getConfig`)();
        
        const { strings } = config;

        console.log(typeof req.body)

        if(req.body && typeof req.body == `object`) {
            const latestConfig = require(`../getConfig`)(req.body);
    
            console.log(`Sending UPDATED config`, latestConfig)
    
            res.send(latestConfig);
        } else {
            const latestConfig = require(`../getConfig`)();
    
            console.log(`Sending config`, latestConfig)
    
            res.send(latestConfig);
        }
    }
}