if(typeof config == `undefined`) {
    let config = {};
}

configuration.get().then(newConf => { config = newConf });
configuration.hook(newConf => { config = newConf });

if(typeof systemColors == `undefined`) {
    let systemColors = {};
}

system.colors().then(newColors => { systemColors = newColors });