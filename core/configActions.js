const sendNotification = require(`./sendNotification`);
const { createDialog } = require(`./createDialog`);

module.exports = (config) => ({
    saveLocation: {
        name: `Choose Save Location`,
        func: () => new Promise(async res => {
            const { dialog } = require(`electron`);

            dialog.showOpenDialog(global.window, {
                title: `Choose Save Location`,
                properties: [`openDirectory`]
            }).then(result => {
                if(result.filePaths[0]) {
                    require(`../getConfig`)({ saveLocation: result.filePaths[0] }).then(res);
                } else {
                    res(null)
                }
            }).catch(e => {
                res(null);
            })
        })
    },
    hardwareAcceleratedConversion: {
        name: `Auto-Detect`,
        func: (link) => new Promise(async res => {
            if(global.window) global.window.webContents.send(`configActionUpdate-hardwareAcceleratedConversion`, {
                message: `Downloading File...`,
                progress: -1
            });

            const hasFFmpeg = await require(`../util/ytdlp`).hasFFmpegPromise();

            if(hasFFmpeg) {
                const platforms = Object.keys(config.hardwareAcceleratedConversion);

                require(`../util/determineGPUDecode`)(link, platforms, (message, progress) => {
                    console.log(progress);
                    if(global.window) global.window.webContents.send(`configActionUpdate-hardwareAcceleratedConversion`, {
                        message,
                        progress
                    })
                }).then(hw => {
                    if(global.window) global.window.webContents.send(`configActionUpdate-hardwareAcceleratedConversion`, {
                        message: `Complete`,
                        complete: true
                    })
    
                    if(hw && hw.results) {
                        console.log(`hardware acceleration:`, hw)
                        console.log(hw);

                        const enabled = Object.entries(hw.results).filter(o => o[1]).map(o => o[0]);
                        const disabled = Object.entries(hw.results).filter(o => !o[1]).map(o => o[0]);

                        sendNotification({
                            headingText: `Hardware Acceleration ${enabled.length > 0 ? `Enabled` : `Disabled`}`,
                            bodyText: `Hardware acceleration (tested with codec ${hw.codec}) has been ${enabled.length > 0 ? `enabled for the following platforms: ${enabled.length > 0 ? enabled.join(`, `) : `none`}` : `disabled: ${disabled.length}/${platforms.length} have failed tests.`}`
                        })

                        require(`../getConfig`)({ hardwareAcceleratedConversion: hw.results }).then(res);
                    } else {
                        console.log(`hardware acceleration:`, null)
                        res(null);
                    }
                }).catch(e => {
                    console.log(`hardware acceleration:`, null)

                    if(typeof e == `string`) {
                        sendNotification({
                            type: `error`,
                            headingText: `Failed to determine hardware acceleration capabilities`,
                            bodyText: e
                        })
                    }

                    res(null);
                })
            } else {
                console.log(`hardware acceleration:`, false)

                if(global.window) global.window.webContents.send(`configActionUpdate-hardwareAcceleratedConversion`, {
                    complete: true
                })

                sendNotification({
                    headingText: `Hardware Acceleration Disabled`,
                    bodyText: `Your settings haven't been changed. FFmpeg is required for Hardware Acceleration to work.`
                })

                res(null);
            }
        })
    },
    ffmpegPresets: {
        name: `Manage Custom Presets`,
        func: () => new Promise(async res => {
            let active = true;

            let presets, modified = false;

            const fetch = (conf) => new Promise(async res => {
                require(`../util/configs`).ffmpegPresets(conf, {
                    values: false,
                    labelDefaults: true,
                }).then(val => {
                    if(conf && typeof conf == `object`) modified = true;
                    presets = val;
                    res(val);
                })
            }); await fetch();

            while(active) await new Promise(async res => {
                const obj = {};
    
                for(const [ name, preset ] of Object.entries(presets)) {
                    if(name != `_defaults` && typeof presets._defaults[name] == `undefined`) obj[name] = preset;
                }
    
                console.log(`ffmpeg CUSTOM presets`, obj);
    
                const entries = Object.entries(obj);

                const { response } = await createDialog({
                    title: `Manage Custom Presets`,
                    body: `You have ${entries.length} preset${entries.length != 1 && `s` || ``} that can be managed here. ${entries.length ? `You can edit the metadata of / delete any presets you create here.` : `You can create presets when converting a piece of media!`}`,
                    buttons: [
                        ...entries.map(([ id, preset ]) => ({
                            text: `<span>${preset.name || `(no name)`}</span><br><span style="font-size: 0.8em; color: #aaa;">${preset.description || `(no description)`}</span>`,
                            id: id,
                        }))
                    ]
                });

                if(response && obj[response]) {
                    const preset = obj[response];

                    const { response: action, inputs } = await createDialog({
                        title: `Managing "${preset.name}"`,
                        body: `You can change the name and description of this preset here.\n\nTo change the arguments, you can edit the preset in the config file, or create a new preset when converting another piece of media.`,
                        inputs: [ 
                            { id: `name`, text: `Name`, value: preset.name }, 
                            { id: `description`, text: `Description`, value: preset.description },
                        ],
                        buttons: [
                            {
                                text: `Cancel`,
                                id: `cancel`,
                            },
                            {
                                text: `Delete`,
                                id: `delete`,
                                icon: `cross`,
                            },
                            {
                                text: `Save`,
                                id: `save`,
                                icon: `check`,
                                primary: true,
                            },
                        ]
                    });

                    const inputsObj = inputs ? inputs.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.value }), {}) : {};

                    if(action == `save`) {
                        if(!inputsObj.name || !inputsObj.description) {
                            createDialog({
                                title: `Couldn't save.`,
                                body: `The preset name and description are both required.`,
                                buttons: [
                                    {
                                        text: `Okay`,
                                        id: `okay`,
                                        icon: `check`,
                                        primary: true,
                                    },
                                ]
                            }).then(res)
                        } else {
                            fetch({
                                ...presets,
                                [response]: Object.assign(preset, {
                                    name: inputsObj.name || preset.name,
                                    description: inputsObj.description || preset.description,
                                }),
                                _defaults: undefined
                            }).then(res);
                        }
                    } else if(action == `delete`) {
                        const { response: confirmation } = await createDialog({
                            title: `Deleting "${preset.name}"`,
                            body: `Are you sure you'd like to delete this preset? This is irreversible.`,
                            buttons: [
                                {
                                    text: `Nevermind`,
                                    id: `false`,
                                    icon: `cross`,
                                },
                                {
                                    text: `Confirm`,
                                    id: `true`,
                                    icon: `check`,
                                    primary: true,
                                },
                            ]
                        });

                        console.log(`delete: ${confirmation}`)

                        if(confirmation == `true`) {
                            await fetch({
                                ...presets,
                                [response]: undefined,
                                _defaults: undefined
                            });

                            sendNotification({
                                headingText: `Removed "${preset.name}"`,
                                bodyText: `The preset has been removed.`
                            });
                        }

                        res();
                    } else res();
                } else if(response && !obj[response]) {
                    sendNotification({
                        type: `error`,
                        headingText: `Error`,
                        bodyText: `The preset you tried to edit doesn't exist.`,
                    });
                    active = false;
                    return res();
                } else {
                    active = false;
                    return res();
                }
            });

            if(modified) {
                require(`../getConfig`)().then(res);
            } else res(null);
        })
    },
})