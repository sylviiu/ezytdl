if(typeof config == `undefined`) {
    let config = {};
}

configuration.get().then(newConf => { config = newConf });
configuration.hook(newConf => { config = newConf });