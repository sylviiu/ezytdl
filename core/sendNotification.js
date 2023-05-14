module.exports = (content) => {
    const window = require(`./window`)();

    console.log(`sending notification ${window ? true : false}`, content);

    if(!window) {
        return false;
    } else {
        window.webContents.send(`notification`, content);
        return true;
    }
}