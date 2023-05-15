const { dialog, app } = require(`electron`);

global.quitting = false;

const quit = () => {
    global.quitting = true;
    app.quit();
}

module.exports = () => new Promise(async res => {
    const queue = require(`../util/downloadManager`).queue;

    const length = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0)

    if(length > 0) {
        /*const { response } = await dialog.showMessageBox({
            type: `question`,
            buttons: [`Yes`, `No`],
            title: `Quit?`,
            message: `You have downloads in progress. Are you sure you want to quit?`
        });*/

        const { response } = await require(`./createDialog`).createDialog({
            title: `Quit?`,
            body: `You have ${length} download${length == 1 ? `` : `s`} in progress. Are you sure you want to quit?`,
            buttons: [
                {
                    text: `Yes`,
                    id: `yes`,
                    icon: `check`
                },
                {
                    text: `No`,
                    id: `no`,
                    primary: true,
                    icon: `cross`
                }
            ]
        });

        if(response == `yes`) {
            res(true);
            quit()
        } else {
            res(false);
        }
    } else {
        res(true);
        quit()
    }
});