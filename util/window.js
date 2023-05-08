const { BrowserWindow, app, globalShortcut } = require('electron');

module.exports = () => {
    const args = {
        width: 800,
        height: 500,
        minHeight: 500,
        minWidth: 700,
        autoHideMenuBar: true,
    };

    if(app.isPackaged) {
        console.log(`-------------\nSTARTING WITH PRODUCTION MODE\n-------------`)

        args.webPreferences = {
            nodeIntegration: false,
            devTools: false,
        };

        const setShortcuts = (enable) => {
            const accelerators = [`CommandOrControl+Shift+I`, `F12`];

            accelerators.forEach((accelerator) => {
                if(enable) {
                    console.log(`Disabled shortcut ${accelerator} (window is focused))`)
                    globalShortcut.register(accelerator, () => false);
                } else {
                    console.log(`Re-enabled shortcut ${accelerator} (window is unfocused)`)
                    globalShortcut.unregister(accelerator);
                }
            })
        }

        app.on('browser-window-blur', function () {
            setShortcuts(false);
        });

        app.on('browser-window-focus', function () {
            setShortcuts(true);
        })
    } else {
        console.log(`-------------\nSTARTING WITH DEVELOPMENT MODE\n-------------`)
    }

    const window = new BrowserWindow(args);

    return window;
}