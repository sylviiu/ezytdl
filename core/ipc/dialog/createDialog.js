module.exports = {
    type: `handle`,
    func: (_e, content) => new Promise(res => require(`../../createDialog`).createDialog(content).then(o => res(JSON.parse(JSON.stringify(o)))))
}