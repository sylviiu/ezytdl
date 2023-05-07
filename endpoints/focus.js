const { app } = require('electron');

module.exports = {
    type: 'get',
    path: '/focus',
    func: (req, res) => {
        if(global.window) {
            if (global.window.isMinimized()) global.window.restore();
        
            global.window.setAlwaysOnTop(true);
            app.focus();
            global.window.setAlwaysOnTop(false);

            console.log(`Focused window!`)
        } else console.log(`Failed to focus window -- window is not defined!`)
        res.send(null)
    }
}