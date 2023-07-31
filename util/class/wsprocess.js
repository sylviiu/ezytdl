const events = require(`events`);
const stream = require(`stream`);
const idGen = require(`../idGen`);
const pfs = require(`../promisifiedFS`);
const path = require(`path`);

const tempPath = require(`electron`).app.getPath('temp');

class wsprocess extends events.EventEmitter {
    constructor(args, opt) {
        super();

        this.args = args;

        this.processID = idGen(24);

        this.stdout = new stream.PassThrough();
        this.stderr = new stream.PassThrough();

        this.persist = opt && typeof opt.persist == `boolean` ? opt.persist : true;
        
        this.cookies = opt && opt.cookies ? opt.cookies : null;
        this.headers = opt && opt.headers ? opt.headers : null;

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

    async _complete(code = 0) {
        const bridge = require(`../pythonBridge`);

        console.log(`[${this.processID}] complete (code: ${code})`);

        if(this.cookiePath) try {
            console.log(`[${this.processID}] Removing cookie file`)
            await pfs.unlink(this.cookiePath);
        } catch(e) {
            console.error(`[${this.processID}] error removing cookie file`, e);
        }

        this.emit(`close`, code);

        console.log(`[${this.processID}] Removing hook`)
        while(bridge.idHooks.filter(h => h.id == this.processID).length > 0) {
            bridge.idHooks.splice(bridge.idHooks.findIndex(h => h.id == this.processID), 1);
        }
    }

    _spawn() {
        const bridge = require(`../pythonBridge`);

        const hook = (data) => {
            if(data.type == `infodump`) {
                console.log(`-------------- INFODUMP (${data.content.length}) --------------`)
                this.emit(`info`, JSON.parse(data.content));
            } else if(data.type == `complete`) {
                this._complete();
            } else if(data.type == `info`) {
                //console.log(`[${this.processID}] info / ${data.content.length}`)
                this.stdout.write(Buffer.from(data.content + `\n`));
            } else if(data.type == `warning` || data.type == `error`) {
                if(data.trace && data.type == `error`) {
                    this.lastTrace = data.trace;
                } else this.lastTrace = null;

                //console.log(`[${this.processID}] err / ${data.content.length}`)
                this.stderr.write(Buffer.from(data.content + `\n`));
            } else {
                //console.log(`[${this.processID}] unknown (${data.type}) / ${data.content.length}`, data.content)
            }
        };
        
        bridge.create().then(async () => {
            const { proxy } = await require(`../../getConfig`)();

            if(proxy) this.args.push(`--proxy`, proxy);

            if(this.headers) Object.entries(this.headers).forEach(([ key, value ]) => this.args.push(`--add-headers`, `${key}:${value}`));

            this.cookiePath = null;

            if(this.cookies && this.cookies.txt) {
                //this.cookiePath = path.join(tempPath, `${idGen(24)}.txt`);
                //console.log(`[${this.processID}] Writing cookie file to ${this.cookiePath}`)
                //await pfs.writeFile(this.cookiePath, this.cookies.txt);
                //this.args.push(`--cookies`, this.cookiePath);
                this.args.push(`--cookiestxt`, this.cookies.txt)
            };

            if(this.cookies && this.cookies.header) {
                this.args.push(`--add-headers`, `Cookie: ${this.cookies.header}`);
            }

            bridge.idHooks.push({ id: this.processID, func: hook, args: this.args, complete: (code) => this._complete(code) });
    
            const obj = {
                id: this.processID,
                args: this.args,
            }
    
            console.log(`spawned ${obj.id}`, obj);

            bridge.resObj.send(JSON.stringify(obj));
        });
    }
}

module.exports = wsprocess;