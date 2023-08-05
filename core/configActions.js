const sendNotification = require(`./sendNotification`);

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
    browserConnector: {
        name: `Download Browser Connector`,
        func: () => new Promise(async res => {
            res(null);
            require(`electron`).shell.openExternal(`https://github.com/sylviiu/ezytdl-browser-connector/tree/main#download`)
        })
    },
    hardwareAcceleratedConversion: {
        name: `Auto-Detect`,
        confirmation: `This is going to send a request to **${config.system.ffmpegTestMediaLink}** download a video to test hardware acceleration. This may take a while.`,
        args: [config.system.ffmpegTestMediaLink],
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
    }
})