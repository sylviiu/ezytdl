if(typeof config == `undefined`) {
    var config = {};
}

configuration.get().then(newConf => { config = newConf });
configuration.hook(newConf => { config = newConf });

var systemColors = system.colors();
console.log(`systemColors: `, systemColors)

var currentColorScheme = systemColors[0];

var appVersion = `0.0.0`;
version.get().then(v => appVersion = v);

var genericURLRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;