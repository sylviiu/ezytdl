module.exports = async () => {
    if(process.platform == `darwin`) {
        const { app } = require(`electron`)
    
        app.on(`activate`, () => require(`../core/bringToFront`)());
        app.on(`before-quit`, (e) => {
            console.log(`(macos) before-quit`);
            if(!global.quitting) {
                e.preventDefault();
                require(`../core/quit`)();
            } else {
                console.log(`(macos) quitting`);
            }
        })
    } else console.log(`doing nothing for platform ${process.platform} (darwin.js)`)
}