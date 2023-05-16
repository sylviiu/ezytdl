module.exports = {
    name: `libvips`,
    func: () => new Promise(res => {
        try {
            require(`sharp`);
            return res({ status: true })
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