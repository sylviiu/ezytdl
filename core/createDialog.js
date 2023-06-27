const idGen = require(`../util/idGen`);

const dialogs = {};

const path = require('path')

module.exports = {
    get: (id) => {
        console.log(`getting dialog ${id}`);
        return dialogs[id]
    },
    createDialog: (content) => new Promise(async res => {
        const id = idGen(16);

        console.log(`creating dialog ${id}`);

        let calledBack = false;

        const callback = (event, id, response, inputs) => {
            if(!calledBack) {
                if(dialogs[id].buttons) {
                    let btn = dialogs[id].buttons.find(b => b.id == response);

                    if(btn) {
                        if(!btn.noResolve) {
                            calledBack = true;
                            dialogs[id].window.close();
                            delete dialogs[id];
                        };
                        
                        if(btn.callback) {
                            btn.callback({ event, id, response, inputs });
                        } else {
                            res({ event, id, response, inputs });
                        }
                    } else {
                        res({ event, id, response, inputs });
                    }
                } else {
                    res({ event, id, response, inputs });
                }
            }
        }

        dialogs[id] = { callback };
    
        const title = content.title || `ezytdl`;
        const body = content.body;
        let buttons = [ { text: `Okay!`, primary: true } ];

        const addButton = (btn) => {
            if(typeof btn == `object` && btn.text && btn.id) {
                console.log(`adding btn`, btn)
                buttons.push(btn);
            } else throw new Error(`Invalid button object! (needs to include text & id)`)
        }

        if(content.buttons && typeof content.buttons === `object` && content.buttons.length > 0) {
            buttons = [];
            content.buttons.forEach(btn => addButton(btn));
        } else if(content.button) {
            buttons = [];
            addButton(content.button);
        }
    
        dialogs[id] = Object.assign({}, content, dialogs[id], { title, body, buttons });
    
        dialogs[id].window = require(`./window`)(true, {
            width: 600,
            height: 250,
            minWidth: 0,
            minHeight: 0,
            resizable: false
        });

        dialogs[id].window.on(`close`, (event) => callback(event, null, null));
    
        dialogs[id].window.loadURL(path.join(__dirname.split(`core`).slice(0, -1).join(`core`), `html`, `dialog.html?${id}`));
    }),
}