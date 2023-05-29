const events = require(`events`);
const stream = require(`stream`);
const idGen = require(`../idGen`);

class wsprocess extends events.EventEmitter {
    constructor(args) {
        super();

        this.bridge = require(`../pythonBridge`);

        this.ws = this.bridge.wsConnection;
        this.args = args;

        this.processID = idGen(24);

        this.stdout = new stream.PassThrough();
        this.stderr = new stream.PassThrough();

        this._spawn();
    }

    _spawn() {
        const hook = (data) => {
            if(data.type == `complete`) {
                this.emit(`close`, 0);
            } else if(data.type == `info`) {
                this.stdout.write(data.content + `\n`);
            } else {
                this.stderr.write(data.content + `\n`);
            }
        };

        this.bridge.idHooks.push({ id: this.processID, func: hook, });

        this.ws.send(JSON.stringify({
            id: this.processID,
            args: this.args,
        }));
    }
}

module.exports = wsprocess;