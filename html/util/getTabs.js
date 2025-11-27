const tabs = {};

const getTabs = () => new Promise(async res => {
    if(Object.keys(tabs).length) return res(tabs);
    
    const parse = () => {
        console.log(`tabs:`, tabs)
        
        res(tabs);
    }

    system.addScript(`./tabs/minified.js`).then(parse).catch(e => {
        system.getTabFiles().then(async tabFiles => {
            console.log(`-- ADDING tabs: ${tabFiles.join(`, `)}`);

            for(const tab of tabFiles.map(s => s.split(`.`).slice(0, -1).join(`.`))) {
                console.log(`-- ADDING tab: ${tab}`)
                await system.addScript(`./tabs/${tab}.js`);
            };

            parse();
        })
    })
})