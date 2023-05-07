const { shell } = require('electron');

module.exports = {
    type: `get`,
    path: `/openFolder/:url(*+)`,
    func: async (req, res) => {
        res.send(null);
        shell.openPath(atob(req.params.url));
    }
}