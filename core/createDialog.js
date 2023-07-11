const idGen = require(`../util/idGen`);

const dialogs = {};

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
            console.log(`callabck: ${id} / ${response}`)
            if(!calledBack && dialogs[id]) {
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

        console.log(`creating window for ${id}`)
    
        dialogs[id].window = await require(`./window`)(true, {
            width: 600,
            height: 250,
            minWidth: 600,
            minHeight: 250,
            resizable: false
        });

        const loadURLPath = require(`../util/getPath`)(`html/dialog.html`)

        console.log(`window created for ${id} -- ${dialogs[id].window}; loading ${loadURLPath}`)

        dialogs[id].window.on(`close`, (event) => callback(event, id, null, null));

        dialogs[id].window.loadFile(loadURLPath);

        dialogs[id].window.webContents.on(`did-finish-load`, () => {
            console.log(`finished loading ${loadURLPath}`);

            const sendObj = JSON.parse(JSON.stringify(Object.assign({}, dialogs[id], { id })));

            dialogs[id].window.webContents.send(`dialog`, sendObj);

            console.log(`sent`, sendObj)
        });
    }),
}