const AutoLaunch = require('auto-launch');
const errorHandler = require('../../util/errorHandler');
const { app } = require('electron');

const launcher = new AutoLaunch({
    name: require(`../../package.json`).name,
    isHidden: true
});

module.exports = app.isPackaged ? async ({ autoLaunch }) => {
    try {
        const isEnabled = await launcher.isEnabled();

        console.log(`[autoLaunch] isEnabled: ${isEnabled}`)
    
        try {
            if(autoLaunch && !isEnabled) {
                console.log(`[autoLaunch] enabling`)
                await launcher.enable();
            } else if(!autoLaunch && isEnabled) {
                console.log(`[autoLaunch] disabling`)
                await launcher.disable();
            }
        } catch(e) {
            errorHandler(e);
        }
    } catch(e) {
        console.error(`[autoLaunch] failed to check auto launch status: ${e}`)
    }
} : () => console.log(`[autoLaunch] not setting up because we're not packaged`)