const { app } = require('electron')

module.exports = async (startTime) => {
    console.log(`[${Date.now() - startTime}ms] BEGINNING TESTRUN`);

    const testObject = {};

    const tests = [
        `0-install-ffmpeg.js`,
        `0-install-ytdlp.js`,
        `1-ffmpegIsExecutable.js`,
        `1-ytdlpIsExecutable.js`,
        `2-getInfo.js`,
        `3-downloadBest.js`,
        `3-downloadAndConvert.js`,
        `4-cancelledDownload.js`,
        `4-cancelledFFmpeg.js`,
    ]
    
    for(const i in tests) await new Promise(async (res) => {
        const testFile = tests[i];

        const test = require(`./tests/${testFile}`);

        const startedThisTest = Date.now();

        console.log(`[${Date.now() - startTime}ms] - ${testFile} (${Number(i)+1}/${tests.length})`);

        let timeout = setTimeout(() => {
            if(!testObject[testFile]) {
                testObject[testFile] = {
                    time: Date.now() - startedThisTest,
                    passed: false,
                    result: `TIMED OUT`,
                }
                console.log(`[${Date.now() - startTime}ms / ${Date.now() - startedThisTest}] - ${testFile} (${Number(i)+1}/${tests.length}) -- TIMED OUT.`)
                return res();
            }
        }, 45000)

        test().then(result => {
            clearTimeout(timeout);
            if(!testObject[testFile]) {
                testObject[testFile] = {
                    time: Date.now() - startedThisTest,
                    passed: true,
                    result,
                }
                console.log(`[${Date.now() - startTime}ms / ${Date.now() - startedThisTest}] - ${testFile} (${Number(i)+1}/${tests.length}) - `, result)
            };
            return res();
        }).catch(e => {
            clearTimeout(timeout);
            testObject[testFile] = {
                time: Date.now() - startedThisTest,
                passed: false,
                result: e,
            }
            console.log(`[${Date.now() - startTime}ms / ${Date.now() - startedThisTest}] - ${testFile} (${Number(i)+1}/${tests.length}) - FAILED - `, e)
            return res();
        })
    });

    console.log(testObject);

    const passed = Object.values(testObject).map(o => o.passed).length, total = Object.keys(testObject).length;
    console.log(`[${Date.now() - startTime}ms] ${passed}/${total} tests passed.`);

    console.log(`${require(`os`).freemem()} free, \n~${Math.round(process.memoryUsage().rss/1000000)}MB used / ~${Math.round(require(`os`).totalmem()/1000000)}MB total`)

    if(passed != total) {
        console.log(`TESTRUN FAILED.`)
        require(`../core/quit`).quit(1);
    } else {
        console.log(`TESTRUN PASSED.`)
        require(`../core/quit`).quit(0);
    }
}