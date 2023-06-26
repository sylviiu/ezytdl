const superagent = require(`superagent`);

let token = null;

module.exports = {
    urls: [`spotify.com`, `open.spotify.com`, `www.spotify.com`, `play.spotify.com`],
    getToken: ({ clientID, clientSecret }) => new Promise(async res => {
        if(!token) {
            if(!clientID || !clientSecret) return res({ value: null, message: `No Client ID or Secret was provided!` });
    
            const req = superagent.post(`https://accounts.spotify.com/api/token`)
            
            req.set(`Authorization`, `Basic ${new Buffer.from(clientID + `:` + clientSecret).toString('base64')}`)
            req.type(`form`).send({ grant_type: `client_credentials` })
            
            req.then(r => {
                if(r.status == 401) return res({ value: null, message: `Client ID or Client Secret was not valid.` });
                else if(r.status == 200) {
                    token = r.body;

                    res({ value: token, message: null });

                    if(r.body.expires_in) setTimeout(() => token = null, r.body.expires_in * 1000);
                }
                else return res({ value: null, message: `An unknown error occurred.` });
            }).catch(e =>  res({ value: null, message: `${e}` }));
        } else res({ value: token, message: null })
    }),
    setup: () => new Promise(async res => {
        require(`../createDialog`).createDialog({
            title: `Spotify Setup`,
            body: `You will need to login to your Spotify account's [developer console](https://developer.spotify.com/dashboard/applications) and create a new application.\n\nOnce you have done that, copy the Client ID and Client Secret into the fields below.`,
            inputs: [ { id: `clientID`, text: `Client ID` }, { id: `clientSecret`, text: `Client Secret` } ],
            buttons: [
                {
                    text: `wait no go back pls`,
                    id: `no`,
                    icon: `cross`
                },
                {
                    text: `Open Developer Console`,
                    id: `openconsole`,
                    noResolve: true,
                    callback: () => {
                        require(`electron`).shell.openExternal(`https://developer.spotify.com/dashboard/applications`);
                        console.log(`opened developer console`)
                    }
                },
                {
                    text: `Save`,
                    id: `yes`,
                    icon: `check`,
                    primary: true,
                },
            ]
        }).then(async ({ event, id, response, inputs }) => {
            if(response == `yes`) {
                console.log(`got response`, response, inputs);

                const obj = {
                    clientID: inputs.find(i => i.id == `clientID`).value,
                    clientSecret: inputs.find(i => i.id == `clientSecret`).value
                }

                module.exports.getToken(obj).then(async ({ value, message }) => {
                    if(value) {
                        res(obj)
                    } else {
                        res(`${message}`)
                    }
                });
            } else res(`Authentication was canceled.`)
        });
    })
}