const events = require(`events`);
const stream = require(`stream`);
const idGen = require(`../idGen`);

class wsprocess extends events.EventEmitter {
    constructor(args) {
        super();

        this.args = args;

        this.processID = idGen(24);

        this.stdout = new stream.PassThrough();
        this.stderr = new stream.PassThrough();

        this._spawn();
    }

    kill(code) {
        const bridge = require(`../pythonBridge`);

        bridge.wsConnection.send(JSON.stringify({
            id: idGen(24),
            type: `kill`,
            targetID: this.processID,
        }));

        this.emit(`close`, code);
    }

    _spawn() {
        const bridge = require(`../pythonBridge`);

        const hook = (data) => {
            if(data.type == `complete`) {
                this.emit(`close`, 0);
            } else if(data.type == `info`) {
                this.stdout.write(Buffer.from(data.content + `\n`));
            } else {
                this.stderr.write(Buffer.from(data.content + `\n`));
            }
        };

        bridge.idHooks.push({ id: this.processID, func: hook, });

        bridge.wsConnection.send(JSON.stringify({
            id: this.processID,
            args: this.args,
        }));
    }
}

module.exports = wsprocess;