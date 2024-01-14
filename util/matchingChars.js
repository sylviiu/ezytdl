module.exports = (arr) => {
    const reference = arr.shift();

    let debug = {
        found: [],
        words: [],
    };

    let matching = [];

    reference.split(' ').forEach((word, wordIndex) => {
        let w = {
            word,
            match: [],
            matching: []
        };

        const letters = word.split('');

        for(const i in letters) {
            const forwardMatches = arr.map(str => str.split(` `)[wordIndex]?.[i] === letters[i]);
            const backwardMatches = arr.map(str => str.split(` `).at(-1 - wordIndex)?.[i] === letters[i]);

            const matches = forwardMatches.includes(true) || backwardMatches.includes(true);

            w.matching[i] = [letters[i], forwardMatches, backwardMatches, matches]

            if(matches && w.match) {
                w.match.push(letters[i]);
            } else if(w.match) {
                w.failed = w.match;
                w.match = null;
            };
        };

        if(w.match) {
            const str = w.match.join('');

            matching.push(str);
            debug.found.push([letters, str]);

            w.matched = w.match.join('');
        }

        debug.words.push(w);
    });

    debug.matching = matching;

    return {
        debug,
        matched: matching.join(` `)
    }
}