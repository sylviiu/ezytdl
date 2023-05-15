const { app } = require(`electron`)

module.exports = () => {
    if(global.windowHidden) {
        global.window.show();
        global.windowHidden = false;
    };

    if(global.window.isMinimized()) global.window.restore();
        
    global.window.setAlwaysOnTop(true);
    app.focus();
    global.window.setAlwaysOnTop(false);

    console.log(`Focused window!`)
}