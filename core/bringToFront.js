const { app } = require(`electron`)

module.exports = () => {
    if(global.window) {
        if(global.windowHidden) {
            global.window.show();
            global.windowHidden = false;
        };
    
        if(global.window.isMinimized()) global.window.restore();
            
        global.window.setAlwaysOnTop(true);
        app.focus();
        global.window.setAlwaysOnTop(false);
    
        console.log(`Focused window!`)
    } else console.log(`There is no window -- ignoring "bringToFront" request`);
}