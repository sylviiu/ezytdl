const child_process = require('child_process');
const fs = require('fs');
const yargs = require('yargs');
const idGen = require(`../util/idGen`);

const execYTDLP = require(`./execYTDLP`);

const sanitize = require(`sanitize-filename`);

var ffmpegVideoCodecs = null;
var ffmpegRawVideoCodecsOutput = null;
var ffmpegPath = null;

const refreshVideoCodecs = () => {
    if(ffmpegPath && fs.existsSync(ffmpegPath)) {
        ffmpegRawVideoCodecsOutput = child_process.execFileSync(ffmpegPath, [`-codecs`, `-hide_banner`, `loglevel`, `error`]).toString().trim();
        ffmpegVideoCodecs = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V`).map(s => s.split(` `)[2]);
    
        console.log(ffmpegVideoCodecs);
    }
}

var refreshFFmpeg = () => {
    ffmpegPath = require(`./filenames/ffmpeg`).getPath();
    if(ffmpegPath) refreshVideoCodecs();
};

refreshFFmpeg();

const time = require(`../util/time`);

const { updateStatus, updateStatusPercent } = require(`../util/downloadManager`);

const sendNotification = require(`../core/sendNotification`);

const getCodec = (file) => {
    let ffprobePath = require(`./filenames/ffmpeg`).getFFprobe();
    
    if(ffprobePath && fs.existsSync(ffprobePath)) {
        try {
            let a = child_process.execFileSync(ffprobePath, [`-v`, `error`, `-select_streams`, `v:0`, `-show_entries`, `stream=codec_name`, `-of`, `default=noprint_wrappers=1:nokey=1`, file]).toString().trim()
            //if(!a) a = child_process.execFileSync(ffprobePath, [`-v`, `error`, `-show_entries`, `stream=codec_name`, `-of`, `default=noprint_wrappers=1:nokey=1`, file]).toString().trim();
            if(a) {
                return a.trim().split(`\n`)[0]
            } else return null;
        } catch(e) {
            console.log(e);
            /*sendNotification({
                headingText: `Error!`,
                bodyText: `An error occured while trying to get the codec of a file! The download may be affected\n\nPath: ${file}\n\nError: ${e.toString()}`,
                type: `error`
            });*/
            return null;
        }
    } else return null
}

const sendUpdates = (proc, initialMsg) => {
    //downloading item {num} of {num}

    console.log(`sending updates...`);

    let firstUpdate = false;

    let downloadingList = false;

    let string = ``;

    proc.stdout.on(`data`, d => {
        string += d.toString().trim()
    })

    proc.stderr.on(`data`, d => {
        string += d.toString().trim()

        if(!firstUpdate) {
            firstUpdate = true;
            updateStatus(initialMsg || `Getting media info...`)
        };
    
        const str = d.toString().trim();

        if(str.trim().startsWith(`ERROR: `)) {
            sendNotification({
                type: `error`,
                headingText: `yt-dlp failed to complete [sendUpdates]`,
                bodyText: `${string.trim().split(`ERROR: `)[1]}`
            })
        }

        if(str.startsWith(`[download] Downloading item `) && str.includes(` of `)) {
            const num = parseInt(str.split(` of `)[0].split(` `).slice(-1)[0]);
            const total = parseInt(str.split(` of `)[1].split(` `)[0]);

            if(typeof num == `number` && typeof total == `number` && num > 1 && total > 1) {
                downloadingList = true;
                console.log(`Downloading item ${num} of ${total}...`)
                updateStatusPercent([num, total])
            }
        };

        if(!downloadingList) {
            if(str.includes(`page`) && str.toLowerCase().includes(`downloading`)) {
                updateStatusPercent([-1, 5])
            } else if(str.includes(`Extracting URL`)) {
                updateStatusPercent([1, 5])
            } else if(str.includes(`Downloading`)) {
                updateStatusPercent([3, 5])
            } else if(str.toLowerCase().includes(`format`)) {
                updateStatusPercent([4, 5])
            }
        }

        if(!str.startsWith(`[debug]`)) {
            updateStatus(str.split(`]`).slice(1).join(`]`).trim())
        }
    })
}

module.exports = {
    additionalArguments: (args) => {
        const returnArgs = [];

        const yargsResult = yargs(args).argv

        const parsed = Object.entries(yargsResult)

        parsed.filter(o => o[1]).forEach((o, i) => {
            if(o[0] != `$0` && o[0] != `_` && o[0].toLowerCase() == o[0]) {
                const str = [`--${o[0]}`, `${o[1]}`];
                console.log(str, o[0], o[1])
                returnArgs.push(...str)
            }
        });

        if(yargsResult._ && yargsResult._.length > 0) returnArgs.push(...yargsResult._)

        return returnArgs;
    },
    parseInfo: (d) => {
        let totalTime = 0;

        const map = e => {
            if(e.duration) {
                e.duration = time(e.duration*1000);
                totalTime += e.duration.units.ms;
            }

            if(e.timestamp) {
                e.released = time((Date.now()/60) - e.timestamp);
            }

            return e;
        }

        if(d.entries) d.entries = d.entries.map(map);
        if(d.formats) d.formats = d.formats.map(map);

        if(d.timestamp) {
            d.released = time((Date.now()/60) - d.timestamp);
        }

        d.duration = time(totalTime)

        return d
    },
    search: ({query, count, from, extraArguments}) => new Promise(async res => {
        if(!count) count = 10;

        const additional = module.exports.additionalArguments(extraArguments);

        console.log(`query "${query}"; count: ${count}; additional args: "${additional.join(`", "`)}"`)

        let args = [`--dump-single-json`, `--quiet`, `--verbose`, `--flat-playlist`, `--playlist-end`, `${count}`, ...additional];

        if(from == `soundcloud`) {
            args.unshift(`scsearch${count}:${query}`)
        } else {
            args.unshift(`ytsearch${count}:${query}`)
        }

        console.log(`search args: "${args.map(s => s.includes(` `) ? `'${s}'` : s).join(` `)}"`)

        const proc = execYTDLP(args);

        let data = ``;

        sendUpdates(proc, `Starting search for "${query}"`);

        proc.stdout.on(`data`, d => {
            //console.log(`output`, d.toString())
            data += d.toString().trim();
        });

        proc.on(`error`, e => {
            console.log(e)
        })

        proc.on(`close`, code => {
            console.log(`search closed with code ${code}`)
            console.log(data)
            const d = JSON.parse(data);
            //if(d.entries.filter(o => !o.title).length != d.entries.length) d.entries = d.entries.filter(o => o.title);
            res(module.exports.parseInfo(d))
            //console.log(d)
        })
    }),
    listFormats: ({query, extraArguments}, disableFlatPlaylist) => new Promise(async res => {
        let url = query;

        const additional = module.exports.additionalArguments(extraArguments);

        console.log(`url "${url}"; additional args: "${additional.join(`", "`)}"`)

        let args = [url, `--dump-single-json`, `--quiet`, `--progress`, `--verbose`, ...additional];

        if(!disableFlatPlaylist) args.push(`--flat-playlist`);

        const proc = execYTDLP(args);

        let data = ``;

        sendUpdates(proc, `Starting info query of "${url}"`);

        proc.stdout.on(`data`, d => {
            //console.log(`output`, d.toString())
            data += d.toString().trim();
        });

        proc.on(`error`, e => {
            console.log(e)
        })

        proc.on(`close`, code => {
            console.log(`listFormats closed with code ${code}`)
            console.log(data)
            const d = JSON.parse(data);
            if(d && d.formats) {
                console.log(`formats found! resolving...`);
                res(module.exports.parseInfo(d))
            } else if(d && d.entries) {
                console.log(`entries found! adding time objects...`);

                let anyNoTitle = false;

                for (entry of d.entries) {
                    if(!entry.title) {
                        anyNoTitle = true;
                        break;
                    }
                };

                if(anyNoTitle && !disableFlatPlaylist) {
                    return module.exports.listFormats({query}, true).then(res)
                } else {
                    res(module.exports.parseInfo(d))
                }
            } else if(!disableFlatPlaylist) {
                updateStatus(`Restarting playlist search... (there were no formats returned!!)`)
                console.log(`no formats found! starting over...`);
                return module.exports.listFormats({query}, true).then(res)
            } else {
                sendNotification({
                    type: `error`,
                    headingText: `Error getting media info`,
                    bodyText: `Either the URL is invalid or the media is unavailable. Please try with a different link.`
                })
                return res(null);
            }
            //console.log(d)
        })
    }),
    getFilename: (url, format, template) => new Promise(async res => {
        const { outputFilename } = require(`../getConfig`)();

        const args = [url, `-o`, template || outputFilename, `--get-filename`, `--quiet`];

        if(format) args.unshift(`-f`, format)

        console.log(args)

        const proc = execYTDLP(args);

        let data = ``;

        proc.stderr.on(`data`, d => {
            console.log(d.toString().trim())

            if(d.toString().trim().startsWith(`ERROR: `)) {
                if(!format) {
                    sendNotification({
                        type: `error`,
                        headingText: `failed to retrieve filename of ${url}: ${d.toString().trim()}`,
                        bodyText: `${d.toString().trim().split(`ERROR: `)[1]}`
                    })
                } else {
                    proc.kill(`SIGKILL`);
                    return module.exports.getFilename(url, null, template).then(res)
                }
            }
        })

        proc.stdout.on(`data`, d => {
            //console.log(`output`, d.toString())
            data += d.toString().trim();
        });

        proc.stderr.on(`data`, d => {
            console.log(d.toString().trim())
        })
        
        proc.on(`close`, code => {
            console.log(`getFilename closed with code ${code}`);
            console.log(data)
            res(data)
        })
    }),
    download: ({url, format, ext, convert, filePath, addMetadata, info, extraArguments}, updateFunc) => new Promise(async resolve => {
        const temporaryFilename = `ezytdl-` + idGen(24);
        
        let obj = {};

        let proc;

        let update = (o) => {
            obj = Object.assign({}, obj, o);
            updateFunc({ latest: o, overall: obj }, proc);
        };

        let filenames = [];
        
        const purgeLeftoverFiles = (saveTo) => {
            const purgeFiles = (from, filename) => {
                let findFiles = filename;

                if(findFiles.startsWith(temporaryFilename)) {
                    findFiles = temporaryFilename;
                } else if(findFiles.endsWith(`.part`)) {
                    findFiles = findFiles.split(`.part`).slice(0, -1).join(`.part`)
                } else if(findFiles.endsWith(`.ytdl`)) {
                    findFiles = findFiles.split(`.part`).slice(0, -1).join(`.ytdl`)
                }

                if(findFiles && fs.existsSync(saveTo)) {
                    const dir = fs.readdirSync(saveTo);
    
                    const prevFiles = dir.filter(f => f.startsWith(findFiles));
                    console.log(`${from} / files:`, prevFiles, `from:`, dir, `starting with:`, findFiles);
    
                    prevFiles.forEach(f => {
                        const file = require(`path`).join(saveTo, f);
                        update({status: `Removing ${from} file ${file} ...`})
                        console.log(`removing previous ${from} file ${file}`);
                        try {
                            if(fs.existsSync(file)) {
                                console.log(`removing ${file}...`)
                                fs.unlinkSync(file)
                            } else console.log(`${file} nonexistent?`)
                        } catch(e) {
                            console.log(`failed removing ${file}: ${e}`)
                        }
                    });
    
                    if(fs.existsSync(saveTo + filename)) {
                        console.log(`original file removing...`)
                        fs.unlinkSync(saveTo + filename);
                    } else console.log(`original file nonexistent?`)
                }
            };

            filenames.forEach((f, i) => {
                console.log(`purging files from index ${i}: ${f}`)
                purgeFiles(`${i}`, f)
            });

            update({status: `Download cancelled.`})

            resolve(obj)
        }

        try {
            const currentConfig = require(`../getConfig`)();
            const { onlyGPUConversion, disableHWAcceleratedConversion, outputFilename, downloadInWebsiteFolders } = currentConfig;

            const saveLocation = downloadInWebsiteFolders && info.webpage_url_domain ? require(`path`).join(currentConfig.saveLocation, sanitize(`${info.webpage_url_domain}`)) : currentConfig.saveLocation;

            if(filePath) filePath = require(`path`).join(saveLocation, sanitize(filePath));

            let thisFormat;

            if(info.is_live && (format == `bv*+ba/b` || format == `bv` || format == `ba`)) format = null;

            if(info.formats) {
                if(info.is_live && !info.formats.find(f => f.format_id == format)) {
                    format = null;
                    thisFormat = info.formats[0]
                } else thisFormat = info.formats.find(f => f.format_id == format) || info.formats[0]
            }

            const fullYtdlpFilename = sanitize(await module.exports.getFilename(url, format, outputFilename + `.%(ext)s`))

            const ytdlpSaveExt = fullYtdlpFilename.split(`.`).slice(-1)[0];

            const ytdlpFilename = fullYtdlpFilename.split(`.`).slice(0, -1).join(`.`);

            if(!thisFormat) thisFormat = {
                ext: ytdlpSaveExt,
                format_id: `unknown`,
                format_note: `unknown`,
                format: `unknown`,
                url
            }
            
            filenames.push(fullYtdlpFilename)
            filenames.push(temporaryFilename)
    
            if(!ffmpegPath || !ffmpegVideoCodecs) refreshFFmpeg();
    
            console.log(saveLocation, filePath, ytdlpFilename)
    
            const saveTo = (filePath || saveLocation) + (require('os').platform() == `win32` ? `\\` : `/`)

            update({ deleteFiles: () => purgeLeftoverFiles(saveTo), live: info.is_live ? true : false, destinationFilename: ytdlpFilename, formatID: format })
    
            fs.mkdirSync(saveTo, { recursive: true, failIfExists: false });
        
            let downloadInExt = null;
    
            let reasonConversionNotDone = null;
        
            killAttempt = 0;

            const additionalArgs = module.exports.additionalArguments(typeof extraArguments == `string` ? extraArguments : ``);

            let args = [...additionalArgs];

            const res = async (o) => {
                console.log(o)
                update(Object.assign({}, typeof o == `object` ? o : {}, { percentNum: -1 }));
                const resolveStatus = obj.status;
                new Promise(async r => {
                    const file = fs.readdirSync(saveLocation).find(f => f.startsWith(ytdlpFilename));
                    const target = require(`path`).join(saveLocation, file || ``);

                    const isWritable = () => {
                        try {
                            fs.accessSync(target, fs.constants.W_OK);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    }

                    if(addMetadata && ffmpegPath && file && fs.existsSync(target)) {
                        console.log(`adding metadata...`)

                        let totalTasks = Object.values(addMetadata).filter(v => v).length + 1;
                        let current = 0;

                        const updateTask = (o) => {
                            current++;
                            update(Object.assign({}, o, {percentNum: Math.round((current/totalTasks) * 100)}))
                        }

                        let n = 0;

                        while(!isWritable()) {
                            n++;
                            update({status: `Waiting for file to unlock for metadata... (${n}/10)`})
                            if(n > 10) break;
                            await new Promise(r => setTimeout(r, 1000));
                        };

                        if(n > 10) {
                            console.log(`file still locked after 10 attempts!`)
                            sendNotification({
                                type: `warn`,
                                headingText: `failed to add metadata to ${info.title}!`,
                                bodyText: `the file is still locked after 10 attempts.`
                            });
                        } else {
                            const cleanup = (restoreOriginal) => {
                                if(fs.existsSync(target + `.ezytdl`) && !fs.existsSync(target)) {
                                    update({status: `Removing temporary file...`})
                                    fs.renameSync(target + `.ezytdl`, target);
                                } else if(fs.existsSync(target + `.ezytdl`) && fs.existsSync(target)) {
                                    if(restoreOriginal) {
                                        update({status: `Rolling back changes...`})
                                        fs.unlinkSync(target);
                                        fs.renameSync(target + `.ezytdl`, target);
                                    } else {
                                        update({status: `Removing temporary file...`})
                                        fs.unlinkSync(target + `.ezytdl`);
                                    }
                                }
                                
                                if(fs.existsSync(target + `.songcover`)) {
                                    update({status: `Removing temporary thumbnail file...`})
                                    fs.unlinkSync(target + `.songcover`);
                                }
                                
                                if(fs.existsSync(target + `.png`)) {
                                    update({status: `Removing temporary thumbnail file...`})
                                    fs.unlinkSync(target + `.png`);
                                }
                            }
                            
                            if(addMetadata.generalInfo) await new Promise(async r => {
                                updateTask({status: `Adding tags...`})

                                cleanup();
    
                                fs.renameSync(target, target + `.ezytdl`);
    
                                const tags = [];
        
                                if(info.track) tags.push([`title`, info.track])
                                else if(info.title) tags.push([`title`, info.title]);
                                if(info.album) tags.push([`album`, info.album]);
                                if(info.artist || info.album_artist || info.creator || info.uploader || info.channel) tags.push([`artist`, info.artist || info.album_artist || info.creator || info.uploader || info.channel]);
                                if(info.track_number) tags.push([`track number`, info.track_number]);
                                if(info.upload_date) tags.push([`year`, info.upload_date.slice(0, 4)], [`date`, info.upload_date]);
                                if(info.genre) tags.push([`genre`, info.genre]);
                                if(info.license) tags.push([`copyright`, info.license]);
                                if(info.description) tags.push([`comment`, info.description]);
    
                                const meta = [];
    
                                tags.forEach(t => meta.push(`-metadata`, `${t[0]}=${t[1].replace(/\n/g, `\r\n`)}`));
        
                                const args = [`-y`, `-i`, target + `.ezytdl`, ...meta, `-c`, `copy`, target];
        
                                console.log(args);
        
                                const proc = child_process.execFile(ffmpegPath, args);
        
                                proc.stdout.on(`data`, d => {
                                    console.log(d.toString().trim())
                                });
        
                                proc.stderr.on(`data`, d => {
                                    console.error(d.toString().trim())
                                });
        
                                proc.on(`error`, e => {
                                    console.error(e)
    
                                    sendNotification({
                                        type: `warn`,
                                        headingText: `failed to add metadata to ${info.title}!`,
                                        bodyText: `${e.toString()}`
                                    });
    
                                    cleanup(true);
                                    r()
                                });
        
                                proc.on(`close`, code => {
                                    console.log(`metadata added! (code ${code})`)
                                    cleanup(code === 0 ? false : true);
                                    r()
                                })
                            }).catch(e => {
                                console.error(e)
    
                                sendNotification({
                                    type: `warn`,
                                    headingText: `failed to add metadata to ${info.title}!`,
                                    bodyText: `${e.toString()}`
                                });
    
                                cleanup(true);
                                r()
                            });

                            if(addMetadata.songCover && info.thumbnail) await new Promise(async r => {
                                updateTask({status: `Downloading thumbnail...`})
    
                                cleanup();

                                fs.renameSync(target, target + `.ezytdl`);
    
                                const req = require(`superagent`).get(info.thumbnail);
    
                                req.pipe(fs.createWriteStream(target + `.songcover`))
    
                                req.once(`error`, e => {
                                    console.log(e)
                                    sendNotification({
                                        type: `warn`,
                                        headingText: `failed to add song cover to ${info.title}!`,
                                        bodyText: `${e.toString()}`
                                    });
                                    fs.renameSync(target + `.ezytdl`, target);
                                    r()
                                });
    
                                req.once(`end`, () => {
                                    update({status: `Converting thumbnail...`})

                                    const imgConvertProc = child_process.execFile(ffmpegPath, [`-y`, `-i`, target + `.songcover`, `-vf`, `crop=min(in_w\\,in_h):min(in_w\\,in_h)`, target + `.png`]);

                                    imgConvertProc.stdout.on(`data`, d => {
                                        console.log(d.toString().trim())
                                    })

                                    imgConvertProc.stderr.on(`data`, d => {
                                        console.error(d.toString().trim())
                                    })

                                    imgConvertProc.on(`close`, code => {
                                        if(code == 0) {
                                            update({status: `Adding thumbnail...`})

                                            const args = [`-y`, `-i`, target + `.ezytdl`, `-i`, `${target + `.png`}`, `-c`, `copy`, `-map`, `0:0`, `-map`, `1:0`, `-metadata:s:v`, `title=Album cover`, `-metadata:s:v`, `comment=Cover (front)`];
                    
                                            if(target.endsWith(`.mp3`)) args.splice(args.indexOf(`1:0`)+1, 0, `-id3v2_version`, `3`, `-write_id3v1`, `1`);
        
                                            console.log(args);
                    
                                            const proc = child_process.execFile(ffmpegPath, [...args, target]);
                    
                                            proc.stdout.on(`data`, d => {
                                                console.log(d.toString().trim())
                                            });
                    
                                            proc.stderr.on(`data`, d => {
                                                console.error(d.toString().trim())
                                            });
                    
                                            proc.on(`error`, e => {
                                                console.error(e)
                
                                                sendNotification({
                                                    type: `warn`,
                                                    headingText: `failed to add song cover to ${info.title}!`,
                                                    bodyText: `${e.toString()}`
                                                });
                
                                                cleanup(true);
                                                r();
                                            });
                    
                                            proc.on(`close`, code => {
                                                console.log(`song cover added! (code ${code})`)
                                                cleanup(code === 0 ? false : true);
                                                r();
                                            })
                                        } else {
                                            console.log(`failed to convert image to png!`)
                                            sendNotification({
                                                type: `warn`,
                                                headingText: `failed to add song cover to ${info.title}!`,
                                                bodyText: `failed to convert image to png!`
                                            });
                                            cleanup(true)
                                        }
                                    })
                                })
                            }).catch(e => {
                                console.error(e)
    
                                sendNotification({
                                    type: `warn`,
                                    headingText: `failed to add song cover to ${info.title}!`,
                                    bodyText: `${e.toString()}`
                                });
    
                                cleanup(true);
                                r()
                            });

                            cleanup();
                        }
                    } else console.log(`no metadata to add! (ffmpeg installed: ${ffmpegPath ? true : false}) (file: ${file ? true : false})`);
    
                    r();
                }).then(() => {
                    update({status: resolveStatus, percentNum: 100})
                    resolve(obj)
                })
            }

            const runThroughFFmpeg = async (code, replaceInputArgs) => {
                let previousFilename = obj.destinationFile ? `ezytdl` + obj.destinationFile.split(`ezytdl`).slice(-1)[0] : temporaryFilename;

                const fallback = (msg, deleteFile) => {
                    try {
                        console.log(`ffmpeg did not save file, renaming temporary file`);
                        if(deleteFile) {
                            fs.unlinkSync(saveTo + previousFilename)
                        } else {
                            fs.renameSync(saveTo + previousFilename, require(`path`).join(saveTo, ytdlpFilename) + `.` + previousFilename.split(`.`).slice(-1)[0]);
                        }
                    } catch(e) { console.log(e) }
                    if(msg && typeof msg == `string`) {
                        update({failed: true, percentNum: 100, status: msg, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.` + previousFilename.split(`.`).slice(-1)[0], url, format})
                    } else update({failed: true, percentNum: 100, status: `Could not convert to ${`${convert ? convert.ext : `--`}`.toUpperCase()}.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.` + previousFilename.split(`.`).slice(-1)[0], url, format});
                    return res(obj)
                    //purgeLeftoverFiles(saveTo)
                };
    
                if(killAttempt > 0) return fallback(`Download canceled.`, true);

                filenames.push(ytdlpFilename)
    
                if(!fs.existsSync(previousFilename)) previousFilename = await module.exports.getFilename(url, format, temporaryFilename + `.%(ext)s`);
    
                filenames.push(previousFilename)

                if(convert) {
                    ext = `.${convert.ext || (thisFormat || {}).ext}`

                    const inputArgs = replaceInputArgs || [`-i`, saveTo + previousFilename/*, `-map`, `0:0`*/];
                    const outputArgs = [require(`path`).join(saveTo, ytdlpFilename) + ext];

                    if(convert.audioBitrate) outputArgs.unshift(`-b:a`, convert.audioBitrate);
                    if(convert.audioSampleRate) outputArgs.unshift(`-ar`, convert.audioSampleRate);
                    if(convert.videoBitrate) outputArgs.unshift(`-b:v`, convert.videoBitrate);
                    if(convert.videoFPS) outputArgs.unshift(`-r`, convert.videoFPS);
                    if(convert.videoResolution) outputArgs.unshift(`-vf`, `scale=${convert.videoResolution.trim().replace(`x`, `:`)}`);

                    //inputArgs.push(`--retries`, `10`, `--fragment-retries`, `10`)

                    const mainArgs = [...inputArgs, ...outputArgs];

                    console.log(`mainArgs: `, mainArgs)
    
                    const spawnFFmpeg = (args2, name) => new Promise((resolveFFmpeg, rej) => {
                        if(killAttempt > 0) {
                            update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                            return res(obj)
                            //purgeLeftoverFiles(saveTo)
                            //return res(`Download canceled.`, true);
                        }
    
                        console.log(`- ` + args2.join(`\n- `))
    
                        update({status: `${replaceInputArgs ? `Streaming & converting to` : `Converting to`} ${`${ext}`.toUpperCase()} using ${name}...<br><br>- ${Object.keys(convert).map(s => `${s}: ${convert[s] || `(no conversion)`}`).join(`<br>- `)}`, percentNum: -1, eta: `--`});
    
                        proc = child_process.execFile(ffmpegPath, [`-y`, ...args2]);
                        
                        update({kill: () => {
                            console.log(`killing ffmpeg conversion...`)
                            killAttempt++
                            proc.stdin.write(`q`)
                            //proc.kill(`SIGINT`);
                        }})
        
                        let duration = null;

                        let allLogs = ``;
        
                        proc.stderr.on(`data`, d => {
                            const data = `${d}`;
                            allLogs += data.trim() + `\n`;
        
                            console.log(`STDERR | ${data.trim()}`);
                            if(data.includes(`Duration:`)) {
                                duration = time(data.trim().split(`Duration:`)[1].trim().split(`,`)[0]).units.ms;
                                console.log(`duration: `, duration)
                            };

                            if(data.trim().startsWith(`ERROR: `)) {
                                sendNotification({
                                    type: `error`,
                                    headingText: `yt-dlp failed to download ${url} [2]`,
                                    bodyText: `${data.trim().split(`ERROR: `)[1]}`
                                })
                            }
        
                            if(data.includes(`time=`)) {
                                const timestamp = time(data.trim().split(`time=`)[1].trim().split(` `)[0]).units.ms;
                                update({percentNum: (Math.round((timestamp / duration) * 1000))/10})
                            }
    
                            let speed = [];
    
                            if(data.includes(`fps=`)) speed.push(data.trim().split(`fps=`)[1].trim().split(` `)[0] + `fps`);
        
                            if(data.includes(`speed=`)) speed.push(data.trim().split(`speed=`)[1].trim().split(` `)[0]);
                            
                            if(speed && speed.length > 0) update({downloadSpeed: speed.join(` | `)})
                        });
        
                        proc.stdout.on(`data`, data => {
                            console.log(`STDOUT | ${data.toString().trim()}`)
                            allLogs += data.toString().trim() + `\n`;
                        });
        
                        proc.on(`close`, (code) => {
                            if(killAttempt > 0) {
                                update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                                return res(obj)
                                //return purgeLeftoverFiles(saveTo)
                                //return res(`Download canceled.`, true);
                            } else if(code == 0) {
                                console.log(`ffmpeg completed; deleting temporary file...`);
                                fs.unlinkSync(saveTo + previousFilename);
                                update({percentNum: 100, status: `Done!`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format});
                                resolveFFmpeg(obj)
                            } else {
                                if(allLogs.includes(`Press [q] to stop, [?] for help`)) {
                                    rej(allLogs.split(`Press [q] to stop, [?] for help`)[1].trim())
                                } else rej(code)
                            }
                        })
                    });
    
                    const transcoders = await (require(`./determineGPUDecode`))()
    
                    console.log(`Retrieving filename`);
                    
                    obj.destinationFile = ytdlpFilename;
    
                    console.log(`file extension was provided! continuing with ffmpeg...`, obj.destinationFile);
    
                    const decoder = transcoders.use;
    
                    console.log(`using decoder: `, decoder);
    
                    const thisCodec = getCodec(saveTo + previousFilename);
    
                    if(thisCodec && !disableHWAcceleratedConversion && decoder) {
                        console.log(`doing video conversion! onlyGPU: ${onlyGPUConversion}`);
                        
                        decoder.codecName = thisCodec + `_` + decoder.string;
    
                        console.log(transcoders)
    
                        let compatibleTranscoders = Object.values(transcoders).filter(o => {
                            if(typeof o == `object`) {
                                const str = thisCodec + `_` + o.string;
                                console.log(str + ` - compatible? ${ffmpegRawVideoCodecsOutput.includes(str)}`)
                                return ffmpegRawVideoCodecsOutput.includes(str)
                            } else return false;
                        }).map(o => {
                            return Object.assign({}, o, {
                                codecName: thisCodec + `_` + o.string
                            })
                        });
    
                        const fallbackToDecoderOnly = () => {
                            console.log(`fallback to decoder only`);
    
                            if(decoder && decoder.name) {
                                spawnFFmpeg([...decoder.pre, ...inputArgs, ...decoder.post, ...outputArgs], `${thisCodec}_software/Dec + ` + `${decoder.post[decoder.post.indexOf(`-c:v`)+1]}` + `/Enc`).then(res).catch(e => {
                                    console.log(`FFmpeg failed converting -- ${e}; trying again...`)
                                    spawnFFmpeg([...inputArgs, ...decoder.post, `-c:v`, `h264`, ...outputArgs], `${thisCodec}_software/Dec + ` + `${decoder.post[decoder.post.indexOf(`-c:v`)+1]}` + `/Enc`).then(res).catch(e => {
                                        console.log(`FFmpeg failed converting -- ${e}; trying again...`)
                                        spawnFFmpeg([...decoder.pre, ...inputArgs, `-c:v`, `h264`, ...outputArgs], `${thisCodec}_software/Dec + ` + `h264_software/Enc`).then(res).catch(e => {
                                            console.log(`FFmpeg failed converting -- ${e}; trying again...`);
                                            if(onlyGPUConversion) {
                                                return fallback(`The video codec (${thisCodec}) provided by the downloaded format is not compatible with FFmpeg's GPU transcoding.`);
                                            } else spawnFFmpeg([...inputArgs, `-c:v`, `h264`, ...outputArgs], `${thisCodec}_software`).then(res).catch(e => {
                                                console.log(`FFmpeg failed converting [1] -- ${e}; trying again...`)
                                                spawnFFmpeg([...inputArgs, ...outputArgs], `${thisCodec}_software`).then(res).catch(fallback);
                                            })
                                        })
                                    })
                                })
                            } else spawnFFmpeg(mainArgs, `${thisCodec}_software`).then(res).catch(fallback)
                        };
    
                        console.log(compatibleTranscoders)
    
                        if(compatibleTranscoders.length > 0) {
                            let done = false;
    
                            for(let transcoder of compatibleTranscoders) {
                                console.log(`trying ${transcoder.name}...`);
                                
                                try {
                                    const conversionProc = await spawnFFmpeg([`-c:v`, transcoder.codecName, ...inputArgs, ...decoder.post, ...outputArgs], transcoder.codecName + `/Dec + ` + `${decoder.post[decoder.post.indexOf(`-c:v`)+1]}` + `/Enc`);
                                    done = true;
                                    res(conversionProc)
                                    break;
                                } catch(e) {
                                    try {
                                        const conversionProc = await spawnFFmpeg([`-c:v`, transcoder.codecName, ...inputArgs, ...transcoder.post, ...outputArgs], transcoder.codecName + `/Dec + ` + `${transcoder.post[transcoder.post.indexOf(`-c:v`)+1]}` + `/Enc`);
                                        done = true;
                                        res(conversionProc)
                                        break;
                                    } catch(e) {
                                        try {
                                            const conversionProc = await spawnFFmpeg([...inputArgs, ...transcoder.post, ...outputArgs], `${thisCodec}_software` + `/Dec + ` + `${transcoder.post[transcoder.post.indexOf(`-c:v`)+1]}` + `/Enc`);
                                            done = true;
                                            res(conversionProc)
                                            break;
                                        } catch(e) {
                                            console.log(`FFmpeg failed converting -- ${e}; trying again...`)
                                        }
                                    }
                                }
                            };
    
                            if(!done) fallbackToDecoderOnly();
                        } else fallbackToDecoderOnly();
                    } else {
                        spawnFFmpeg(mainArgs, `software`).then(res).catch(fallback)
                    }
                } else if(!convert) {
                    if(killAttempt > 0) {
                        update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                        return res(obj)
                        //purgeLeftoverFiles(saveTo)
                    } else if(args.includes(`-S`) && ytdlpSaveExt == ext) {
                        update({code, saveLocation, url, format, status: `Downloaded best quality provided for ${ext} format (no conversion done${reasonConversionNotDone ? ` -- ${reasonConversionNotDone}` : ``})`});
                    } else if(args.includes(`-S`) && ytdlpSaveExt != ext) {
                        update({code, saveLocation, url, format, status: `${ext} was not provided by this website (downloaded ${ytdlpSaveExt} instead${reasonConversionNotDone ? ` -- ${reasonConversionNotDone}` : ``})`});
                    } else if(reasonConversionNotDone) {
                        update({code, saveLocation, url, format, status: `Could not convert: ${reasonConversionNotDone}`});
                    } else update({code, saveLocation, url, format, status: `Done!`});
                    res(obj)
                } else {
                    if(killAttempt > 0) {
                        update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                        return res(obj)
                        //purgeLeftoverFiles(saveTo)
                    } else {
                        update({code, saveLocation, url, format, status: `Done!`})
                        res(obj)
                    }
                }
            };

            console.log(`--- DOWNLOADING FORMAT (${format}) ---\n`, thisFormat)

            if(/*thisFormat && thisFormat.protocol && thisFormat.protocol.toLowerCase().includes(`m3u8`) && fs.existsSync(ffmpegPath)*/ false) {
            } else {
                args = [`-f`, format, url, `-o`, require(`path`).join(saveTo, ytdlpFilename) + `.%(ext)s`, `--no-mtime`, ...additionalArgs];
    
                args.push(`--ffmpeg-location`, ``);
        
                if(fs.existsSync(ffmpegPath)) {
                    //args.push(`--ffmpeg-location`, ffmpegPath);
                } else {
                    if(convert && convert.ext) {
                        ext = convert.ext
                        convert = false;
                        reasonConversionNotDone = `ffmpeg not installed`
                    };
                }
                
                if(convert && !ext) {
                    args[4] = args[4].replace(ytdlpFilename, temporaryFilename);
                    //args.splice(5, 2);
                } else {
                    if(addMetadata && addMetadata.generalInfo) args.push(`--add-metadata`);
                    if(addMetadata && addMetadata.thumbnail) args.push(`--embed-thumbnail`);
                    if((format == `bv*+ba/b` || format == `bv`) && ext) {
                        if(format == `bv`) {
                            args.splice(2, 0, `-S`, `ext:${ext}`)
                            downloadInExt = ext
                        } else {
                            args.splice(2, 0, `-S`, `ext:${ext}:m4a`)
                            downloadInExt = ext + `:m4a`
                        };
                    } else if(format == `ba` && ext) {
                        args.splice(2, 0, `-S`, `ext:${ext}`);
            
                        downloadInExt = ext
                    }
                }
                
                console.log(`saveTo: ` + saveTo, `\n- ` + args.join(`\n- `))
        
                proc = execYTDLP(args);
        
                update({saveLocation: saveTo, url, format, kill: () => {
                    console.log(`killing yt-dlp download...`)
                    killAttempt++
                    if(killAttempt > 1) {
                        proc.kill(`SIGKILL`);
                    } else proc.kill(`SIGINT`);
                }, status: `Downloading...`})
        
                proc.stdout.on(`data`, data => {
                    const string = data.toString();
        
                    console.log(string.trim());
        
                    if(string.includes(`Destination:`)) {
                        update({destinationFile: string.split(`Destination:`)[1].trim()});
                        if(!filenames.find(s => s == obj.destinationFile)) filenames.push(obj.destinationFile)
                    }
        
                    const percent = string.includes(`%`) ? string.split(`%`)[0].split(` `).slice(-1)[0] : null;
                    if(percent) {
                        const downloadSpeed = string.includes(`/s`) ? string.split(`/s`)[0].split(` `).slice(-1)[0] + `/s` : `-1B/s`;
                        const eta = string.includes(`ETA`) ? string.split(`ETA`)[1].split(` `).slice(1).join(` `) : `00:00`;
                        percentNumUpdated = true;
                        //console.log(percent)
                        update({percentNum: Number(percent), downloadSpeed, eta});
                    }
                });

                let fallbackToFFmpeg = false;
        
                proc.stderr.on(`data`, data => {
                    const string = data.toString();
    
                    if(string.trim().startsWith(`ERROR: `)) {
                        if(string.toLowerCase().includes(`ffmpeg not found`) && string.toLowerCase().includes(`postprocessing`)) {
                            console.log(`not doing anything with this error`, string.trim())
                        } else if(string.toLowerCase().includes(`ffmpeg could not be found`)) {
                            fallbackToFFmpeg = true;
                        } else sendNotification({
                            type: `error`,
                            headingText: `yt-dlp failed to download ${url} [1]`,
                            bodyText: `${string.trim().split(`ERROR: `)[1]}`
                        })
                    }
        
                    console.log(string.trim())
    
                    // FFMPEG LOGS BELOW (in case of something like a livestream)
    
                    let speed = [];
    
                    if(string.includes(`fps=`)) speed.push(string.trim().split(`fps=`)[1].trim().split(` `)[0] + `fps`);
    
                    if(info.is_live && string.includes(`time=`)) {
                        speed.push(string.trim().split(`time=`)[1].trim().split(` `)[0]);
                    } else if(string.includes(`speed=`)) {
                        speed.push(string.trim().split(`speed=`)[1].trim().split(` `)[0]);
                    }
                    
                    if(speed && speed.length > 0) update({downloadSpeed: speed.join(`<br>`)});
                })
                
                proc.on(`close`, async code => {
                    update({kill: () => {
                        console.log(`nothing to kill...`)
                        killAttempt++
                    }});

                    if(fallbackToFFmpeg && ffmpegPath) {
                        if(!convert) {
                            // download with FFmpeg instead of yt-dlp
            
                            args = [...(disableHWAcceleratedConversion ? [] : [`-hwaccel`, `auto`]), `-i`, thisFormat.url || url, `-movflags`, `+faststart`, `-c`, `copy`, `-y`, require(`path`).join(saveTo, ytdlpFilename) + `.mkv`];
            
                            if(info.http_headers) {
                                console.log(`using http headers:`, info.http_headers);
            
                                args.unshift(`-headers`, Object.keys(info.http_headers).map(s => `${s}: ${info.http_headers[s]}`).join(`\r\n`))
                            }
            
                            console.log(`saveTo: ` + saveTo, `\n- ` + args.join(`\n- `))
            
                            proc = child_process.execFile(ffmpegPath, args);
                    
                            update({saveLocation: saveTo, url, format, kill: () => {
                                console.log(`killing ffmpeg stream...`)
                                killAttempt++
                                proc.stdin.write(`q`)
                                //proc.kill(`SIGINT`);
                            }, status: `Streaming (with FFmpeg)...`})
            
                            let savedTime = `00:00`
            
                            const log = (data) => {
                                const string = data.toString().trim();
            
                                console.log(string)
                                
                                let speed = [];
                
                                if(string.includes(`fps=`)) speed.push(string.trim().split(`fps=`)[1].trim().split(` `)[0] + `fps`);
                
                                if(info.is_live && string.includes(`time=`)) {
                                    const time = string.trim().split(`time=`)[1].trim().split(` `)[0];
                                    savedTime = time;
                                    speed.push(time);
                                } else if(string.includes(`speed=`)) {
                                    speed.push(string.trim().split(`speed=`)[1].trim().split(` `)[0]);
                                }
                                
                                if(speed && speed.length > 0) update({downloadSpeed: speed.join(`<br>`)});
                            }
            
                            proc.stderr.on(`data`, log)
                            proc.stdout.on(`data`, log)
                            
                            proc.on(`close`, async code => {
                                update({kill: () => {
                                    console.log(`nothing to kill...`)
                                    killAttempt++
                                }, live: false, percentNum: 0});
            
                                proc = child_process.execFile(ffmpegPath, [`-i`, require(`path`).join(saveTo, ytdlpFilename) + `.mkv`, `-c`, `copy`, `-y`, require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`]);
            
                                update({status: `Remuxing to ${`${ytdlpSaveExt}`.toUpperCase()}`, kill: () => {
                                    killAttempt++
                                    //proc.stdin.write(`q`)
                                    proc.kill(`SIGINT`);
            
                                    // dont auto kill this process, because if the user cancelled the last one, chances are it was a 24/7 livestream.
                                }});
            
                                const updateTime = (d) => {
                                    const string = d.toString().trim();
            
                                    if(string.includes(`time=`)) {
                                        const current = time(string.trim().split(`time=`)[1].trim().split(` `)[0]).units.ms;
                                        const total = time(savedTime).units.ms;
            
                                        update({percentNum: current/total})
                                    }
                                    
                                    let speed = [];
            
                                    if(string.includes(`speed=`))  speed.push(string.trim().split(`speed=`)[1].trim().split(` `)[0]);
                                    if(string.includes(`fps=`)) speed.push(string.trim().split(`fps=`)[1].trim().split(` `)[0] + `fps`);
                                    
                                    if(speed && speed.length > 0) update({downloadSpeed: speed.join(`<br>`)});
                                }
            
                                proc.stderr.on(`data`, updateTime)
                                proc.stdout.on(`data`, updateTime)
            
                                proc.on(`close`, async code => {
                                    update({kill: () => {
                                        console.log(`nothing to kill...`)
                                        killAttempt++
                                    }});
    
                                    if(convert) {
                                        runThroughFFmpeg(code);
                                    } else {
                                        if(fs.existsSync(require(`path`).join(saveTo, ytdlpFilename) + `.mkv`)) fs.unlinkSync(require(`path`).join(saveTo, ytdlpFilename) + `.mkv`);
                                        update({code, saveLocation, url, format, status: `Done!`})
                                        res(obj)
                                    }
                                })
                            })
                        } else {
                            let ffmpegInputArgs = [`-i`, thisFormat.url || url];
    
                            if(info.http_headers) {
                                console.log(`using http headers:`, info.http_headers);
            
                                ffmpegInputArgs.unshift(`-headers`, Object.keys(info.http_headers).map(s => `${s}: ${info.http_headers[s]}`).join(`\r\n`))
                            }
    
                            killAttempt = 0;
    
                            runThroughFFmpeg(code, ffmpegInputArgs);
                        }
                    } else runThroughFFmpeg(code);
                })
            }
        } catch(e) {
            console.error(e);
            sendNotification({
                type: `error`,
                headingText: `Error downloading media (${format} / ${info && info.title ? info.title : `unknown`})`,
                bodyText: `An error occured while trying to download the media.\n\nError: ${e.toString()}`
            });
            update({ failed: true, status: `${e.toString()}` })
        }
    })
}