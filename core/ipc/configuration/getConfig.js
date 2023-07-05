module.exports = {
    type: `handle`,
    func: (_e, name) => {
        console.log(`Config request: ${name}`, name)

        if(name) {
            return require(`../../../util/configs`)[name]();
        } else return require(`../../../getConfig`)();
    }
}