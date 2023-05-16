module.exports = {
    name: `libvips`,
    func: () => new Promise(res => {
        try {
            require(`sharp`)
        } catch(e) {
            if(e.toString().includes(`libvips`)) {
                return res({
                    status: false,
                    missing: `libvips`,
                    required: true,
                });
            } else return res({
                status: false,
                error: e.message || e.toString(),
                required: true,
            });
        }
    })
}