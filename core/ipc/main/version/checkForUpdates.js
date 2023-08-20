let lastChecked = 0;

module.exports = {
    type: `handle`,
    func: () => {
        if(Date.now() - lastChecked < 15000) return null;

        lastChecked = Date.now();

        require(`../../../../util/checkForUpdates`)();

        return null;
    },
}