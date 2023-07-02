const sendNotification = require(`./sendNotification`);

module.exports = (config) => ({
    saveLocation: {
        name: `Choose Save Location`,
        func: () => new Promise(async res => {
            const { dialog } = require(`electron`);

            dialog.showOpenDialog(global.window, {
                properties: [`openDirectory`]
            }).then(result => {
                if(result.filePaths[0]) {
                    sendNotification({
                        headingText: `Updated Save Location`,
                        bodyText: `Your save location has been updated to "${result.filePaths[0]}"`
                    });

                    res(require(`../getConfig`)({ saveLocation: result.filePaths[0] }))
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
        confirmation: `This is going to send a request to **${config.system.ffmpegTestMediaLink}** download a video to test hardware acceleration. This may take a while.`,
        args: [config.system.ffmpegTestMediaLink],
        func: (link) => new Promise(async res => {
            const hasFFmpeg = require(`../util/ytdlp`).hasFFmpeg();

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
    
                    if(hw) {
                        console.log(`hardware acceleration:`, hw)
                        console.log(hw);

                        const enabled = Object.entries(hw).filter(o => o[1]).map(o => o[0]);
                        const disabled = Object.entries(hw).filter(o => !o[1]).map(o => o[0]);

                        sendNotification({
                            headingText: `Hardware Acceleration ${enabled.length > 0 ? `Enabled` : `Disabled`}`,
                            bodyText: `Hardware acceleration has been ${enabled.length > 0 ? `enabled for the following platforms: ${enabled.length > 0 ? enabled.join(`, `) : `none`}` : `disabled: ${disabled.length}/${platforms.length} have failed tests.`}`
                        })

                        res(require(`../getConfig`)({ hardwareAcceleratedConversion: hw }))
                    } else {
                        console.log(`hardware acceleration:`, null)
                        res(null);
                    }
                })
            } else {
                console.log(`hardware acceleration:`, false)

                sendNotification({
                    headingText: `Hardware Acceleration Disabled`,
                    bodyText: `Your settings haven't been changed. FFmpeg is required for Hardware Acceleration to work.`
                })

                res(null);
            }
        })
    }
})