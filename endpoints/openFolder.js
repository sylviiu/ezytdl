const { shell } = require('electron');

const fs = require(`fs`);

module.exports = {
    type: `get`,
    path: `/openFolder/:url(*+)`,
    func: async (req, res) => {
        const path = atob(req.params.url);

        console.log(`path: ${path}`)

        /*if(fs.existsSync(path) && !fs.existsSync(path + `/`)) {
            shell.showItemInFolder(path);
            return res.send(`Opened file`)
            // this for some reasons opens the actual file in windows -- i don't want it to do that??? not sure if it's just me.
        } else */{
            shell.openPath(path);
            return res.send(`Opened folder`)
        }
    }
}