const readline = require(`readline`);

module.exports = (socket, log) => {
    log(`established connection!`);

    socket.on(`message`, data => {
        log(`<- "${data}"`);
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.addListener(`close`, () => {
        log(`closed RL interface`);
        socket.close();
    });

    rl.on(`line`, line => {
        log(`-> "${line}"`);
        socket.send(line);
    });

    log(`created RL interface`);
}