if(typeof config == `undefined`) {
    let config = {};
}

configuration.get().then(newConf => { config = newConf });
configuration.hook(newConf => { config = newConf });

var systemColors = system.colors();
console.log(`systemColors: `, systemColors)

var appVersion = `0.0.0`;
version.get().then(v => appVersion = v);