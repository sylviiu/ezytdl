const createDialog = require(`./util/createDialog`);

const fs = require(`fs`);

const express = require(`express`);
const app = express();

const errorAndExit = require(`./util/errorAndExit`);

module.exports = () => new Promise(async res => {
    let server;

    try {
        server = app.listen(3000, () => {
            console.log(`Server started on port 3000`);
        })
    } catch(e) {
        console.error(`Failed starting server on port 3000: ${e}`);
        return errorAndExit(`Failed to start internal server; is the app already running?`);
    }

    const endpoints = fs.readdirSync(`./endpoints/`).filter(f => f.endsWith(`.js`));

    for(const file of endpoints) {
        const endpoint = require(`./endpoints/${file}`);

        if(typeof endpoint == `function`) {
            endpoint(app, server)
        } else {
            if(!endpoint.path) return console.error(`Failed to import file ${file} -- you forgot the path lol`)
            if(!endpoint.type) return console.error(`Failed to import file ${file} -- you forgot the request type lol`)
            if(!endpoint.func) return console.error(`Failed to import file ${file} -- you forgot the func lol`);
    
            const registerType = (type) => {
                app[type](endpoint.path, endpoint.func);
    
                console.log(`Successfully created endpoint:\n  [${type.toUpperCase()}] "${endpoint.path}"`)
            }
    
            if(typeof endpoint.type !== `string`) {
                const types = endpoint.type.filter(type => app[type] ? true : false);
    
                for (type of types) registerType(type)
            } else if (app[endpoint.type]) {
                registerType(endpoint.type);
            } else console.error(`Failed to import file ${file} -- there is no endpoint type "${endpoint.type}`)
        }
    }
    
    res(app);
})