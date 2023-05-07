module.exports = {
    type: `post`,
    path: `/config`,
    func: (req, res) => {
        console.log(`Config request`)
        
        const config = require(`../getConfig`)();
        
        let modified = 0;

        console.log(typeof req.body)

        if(req.body && typeof req.body == `object`) {
            for (key of Object.keys(req.body)) {
                if(config[key] !== undefined) {
                    config[key] = req.body[key];
                    modified++;
                }
            };

            console.log(`Modified ${modified}/${Object.keys(req.body).length} keys`);
        }
        
        const latestConfig = modified == 0 ? config : require(`../getConfig`)(config);

        console.log(`Sending config`, latestConfig)

        res.send(latestConfig);
    }
}