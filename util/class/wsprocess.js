const events = require(`events`);
const stream = require(`stream`);
const idGen = require(`../idGen`);

class wsprocess extends events.EventEmitter {
    constructor(args, opt) {
        super();

        this.args = args;

        this.processID = idGen(24);

        this.stdout = new stream.PassThrough();
        this.stderr = new stream.PassThrough();

        this.persist = opt && typeof opt.persist == `boolean` ? opt.persist : true;

        this._spawn();
    }

    kill(code) {
        const bridge = require(`../pythonBridge`);

        bridge.resObj.send(JSON.stringify({
            id: idGen(24),
            type: `kill`,
            targetID: this.processID,
        }));
    }

    _complete(code = 0) {
        const bridge = require(`../pythonBridge`);

        console.log(`[${this.processID}] complete (code: ${code})`)
        this.emit(`close`, code);
        
        while(bridge.idHooks.filter(h => h.id == this.processID).length > 0) {
            bridge.idHooks.splice(bridge.idHooks.findIndex(h => h.id == this.processID), 1);
        }
    }

    _spawn() {
        const bridge = require(`../pythonBridge`);

        const hook = (data) => {
            if(data.type == `complete`) {
                this._complete();
            } else if(data.type == `info`) {
                console.log(`[${this.processID}] info / ${data.content.length}`)
                this.stdout.write(Buffer.from(data.content + `\n`));
            } else {
                console.log(`[${this.processID}] err / ${data.content.length}`)
                this.stderr.write(Buffer.from(data.content + `\n`));
            }
        };

        bridge.idHooks.push({ id: this.processID, func: hook, args: this.args, complete: (code) => this._complete(code) });

        bridge.resObj.send(JSON.stringify({
            id: this.processID,
            args: this.args,
        }));
    }
}

module.exports = wsprocess;