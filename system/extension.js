const net = require('net');
const fs = require('fs');
const { app } = require('electron');

const idGen = require(`../util/idGen`)

module.exports = async () => {
    const name = `ezytdl-extension`;

    const pipepath = process.platform == `win32` ? `\\\\.\\pipe\\${name}` : `/tmp/${name}.sock`;

    const server = net.createServer(s => {
        console.log(`[${pipepath}] client connected`);

        process.stdin.on('data', data => {
            const str = data.toString().trim();
            s.write(str);
        });

        s.on('data', data => {
            console.log(`[${pipepath}] received data: ${data.toString()}`);
        });

        s.on('end', () => {
            console.log(`[${pipepath}] client disconnected`);
            server.close();
        });
    });

    server.once('close', () => {
        console.log(`[${pipepath}] server closed`);

        if(fs.existsSync(pipepath)) try {
            fs.unlinkSync(pipepath);
            console.log(`[${pipepath}] pipe deleted`);
        } catch(e) {
            console.log(`[${pipepath}] failed to delete pipe: ${e.message}`);
        };
        
        process.exit(0);
    });

    server.listen(pipepath);

    const locked = app.requestSingleInstanceLock({ type: `extension`, pipe: pipepath });

    if(locked) {
        console.log(`App is not running.`);
        process.exit(1);
    } else {
        console.log(`App is running.`);
    }
};

module.exports.client = ({ pipe }) => {
    console.log(`Connecting to ${pipe}...`);

    const client = net.createConnection(pipe);

    client.on('connect', () => {
        console.log(`Connected!`);
        client.write(`hello`);
    });

    client.on('data', data => {
        const str = data.toString().trim();

        try {
            const o = JSON.parse(str);
            console.log(o);
        } catch(e) {
            console.error(`Failed to parse JSON: ${e.message} (from extension pipe)`);
        }
    });

    client.on('end', () => {
        console.log(`Disconnected!`);
    });

    client.on('error', err => {
        console.log(`Error: ${err.message}`);
    });
}