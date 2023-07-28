const sorters = {
    // go by a.quality and b.quality, higher should go first
    // if there is no quality, send before the ones with quality
    qualityIndex: {
        func: (a,b) => {
            if(!a.quality) a.quality = 0;
            if(!b.quality) b.quality = 0;

            if(a.quality || b.quality) {
                if(a.quality == b.quality) {
                    return 0;
                } else if(a.quality > b.quality) {
                    return 1;
                } else if(a.quality < b.quality) {
                    return -1;
                } else return 0;
            } else return 0;
        },
        filter: [`audio`, `video`]
    },
    videoQuality: {
        func: (a,b) => {
            if(a.width || a.height || b.width || b.height) {
                const aVal = (a.width || 1) * (a.height || 1) * ((a.vbr || 0) * (a.tbr || 1)) * (a.fps || 1);
                const bVal = (b.width || 1) * (b.height || 1) * ((b.vbr || 0) * (b.tbr || 1)) * (b.fps || 1);
    
                if((aVal) > (bVal)) {
                    return -1;
                } else if((aVal) < (bVal)) {
                    return 1;
                } else if(aVal != 1) {
                    return -1;
                } else if(bVal != 1) {
                    return 1;
                } else return 0;
            };
        },
        filter: [`video`]
    },
    audioQuality: {
        func: (a,b) => {
            if(a.asr || a.abr || b.asr || b.abr) {
                const aVal = ((a.asr || 1) * (a.abr || 1));
                const bVal = ((b.asr || 1) * (b.abr || 1));
    
                if(aVal > bVal) {
                    return -1;
                } else if(aVal < bVal) {
                    return 1;
                } else if(aVal != 1) {
                    return -1;
                } else if(bVal != 1) {
                    return 1;
                } else return 0;
            } else return 0;
        },
        filter: [`audio`]
    },
};

module.exports = function sort(useFilter=[ `audio`, `video` ]) {
    const sorters2 = {};

    console.log(`ytdlpQualitySorters using filter`, useFilter)

    for(const [key, { filter, func }] of Object.entries(sorters)) {
        if(useFilter.find(s => filter.includes(s))) {
            sorters2[key] = func;
        };
    };

    console.log(`ytdlpQualitySorters`, sorters2)

    return sorters2;
};

for(const [key, func] of Object.entries(module.exports())) {
    console.log(`ytdlpQualitySort`, key, func)
    module.exports[key] = func;
};

console.log(`ytdlpQualitySort`, module.exports)