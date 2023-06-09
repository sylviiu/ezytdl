const child_process = require('child_process');
const fs = require('fs');
const pfs = require('./promisifiedFS');
const yargs = require('yargs');
const { compareTwoStrings } = require('string-similarity');
const idGen = require(`../util/idGen`);
const downloadManager = require(`./downloadManager`);
const authentication = require(`../core/authentication`);
const getPath = require(`../util/getPath`);

const outputTemplateRegex = /%\(\s*([^)]+)\s*\)s/g;

const libPath = getPath(`./html/lib.js`, true);

var animeFunc;

if(libPath) {
    const lib = `//` + (fs.readFileSync(libPath).toString().split(`//`)[1].split(`// `)[0].trim());

    console.log(lib);

    const currentModule = module;

    animeFunc = eval(`module = {exports: null}; ${lib}; module.exports`);

    module = currentModule;
} else {
    animeFunc = require(`animejs`);
}

const durationCurve = animeFunc.easing(`easeInExpo`);

const platforms = fs.readdirSync(getPath(`./util/platforms`)).map(f => 
    Object.assign(require(`../util/platforms/${f}`), {
        name: f.split(`.`).slice(0, -1).join(`.`)
    })
);

console.log(`platforms:`, platforms)

const execYTDLP = require(`./execYTDLP`);

const sanitizeFilename = require(`sanitize-filename`);

const sanitize = (str) => sanitizeFilename(str, { replacement: `-` });

const sanitizePath = (...paths) => {
    const parsed = require(`path`).parse(require(`path`).join(...paths));

    if(parsed.dir.startsWith(parsed.root)) parsed.dir = parsed.dir.slice(parsed.root.length);

    const dir = parsed.dir.replace(parsed.root, ``).replace(/\\/g, `/`).split(`/`)

    return require(`path`).join(parsed.root, ...[...dir, parsed.base].map(sanitize))
}

var ffmpegRawVideoCodecsOutput = null;

var ffmpegRawVideoCodecsDecodeOutput = null;
var ffmpegRawVideoCodecsEncodeOutput = null;

var ffmpegVideoCodecs = null;
var ffmpegAudioCodecs = null;

const refreshVideoCodecs = () => {
    console.log(`refreshVideoCodecs (promise)`)
    if(module.exports.ffmpegPath && fs.existsSync(module.exports.ffmpegPath)) {
        console.log(`ffmpegPath exists!`);

        ffmpegRawVideoCodecsOutput = child_process.execFileSync(module.exports.ffmpegPath, [`-codecs`, `-hide_banner`, `loglevel`, `error`]).toString().split(`-------`).slice(1).join(`-------`).trim();

        ffmpegRawVideoCodecsDecodeOutput = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V` && s[1] == `D`);
        ffmpegRawVideoCodecsEncodeOutput = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V` && s[2] == `E`);

        ffmpegVideoCodecs = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V`).map(s => s.split(` `)[2]);
        ffmpegAudioCodecs = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `A`).map(s => s.split(` `)[2]);
    
        //console.log(ffmpegVideoCodecs, `decode:`, ffmpegRawVideoCodecsDecodeOutput, `encode:`, ffmpegRawVideoCodecsEncodeOutput);
    }
}

var refreshFFmpeg = () => {
    if(!module.exports.ffmpegPath || !fs.existsSync(module.exports.ffmpegPath)) module.exports.ffmpegPath = require(`./filenames/ffmpeg`).getPath();

    if(module.exports.ffmpegPath && !ffmpegVideoCodecs) {
        refreshVideoCodecs();
        return true;
    } else if(module.exports.ffmpegPath) {
        return true;
    } else return false;
};

const refreshVideoCodecsPromise = () => new Promise(async res => {
    console.log(`refreshVideoCodecs (promise)`)
    if(module.exports.ffmpegPath && (await pfs.existsSync(module.exports.ffmpegPath))) {
        console.log(`ffmpegPath exists! (promise)`);

        const proc = child_process.execFile(module.exports.ffmpegPath, [`-codecs`, `-hide_banner`, `loglevel`, `error`]);

        let data = ``

        proc.stdout.on(`data`, d => data += d.toString().trim());

        proc.once(`close`, code => {
            if(code != 0) return res(null);

            ffmpegRawVideoCodecsOutput = data;
    
            ffmpegRawVideoCodecsDecodeOutput = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V` && s[1] == `D`);
            ffmpegRawVideoCodecsEncodeOutput = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V` && s[2] == `E`);
    
            ffmpegVideoCodecs = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `V`).map(s => s.split(` `)[2]);
            ffmpegAudioCodecs = ffmpegRawVideoCodecsOutput.split(`\n`).filter(s => s[3] == `A`).map(s => s.split(` `)[2]);
    
            res();
        })
    
        //console.log(ffmpegVideoCodecs, `decode:`, ffmpegRawVideoCodecsDecodeOutput, `encode:`, ffmpegRawVideoCodecsEncodeOutput);
    }
})

var refreshFFmpegPromise = () => new Promise(async res => {
    if(!module.exports.ffmpegPath || !(await pfs.existsSync(module.exports.ffmpegPath))) module.exports.ffmpegPath = await require(`./filenames/ffmpeg`).getPathPromise();

    if(module.exports.ffmpegPath && !ffmpegVideoCodecs) {
        refreshVideoCodecsPromise().then(() => res(true));
    } else if(module.exports.ffmpegPath) {
        res(true);
    } else res(false);
})

refreshFFmpeg();

const time = require(`../util/time`);

const { updateStatus, updateStatusPercent } = downloadManager.default;

const sendNotification = require(`../core/sendNotification`);

const sendUpdates = (proc, initialMsg) => {
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
                bodyText: `${string.trim().split(`ERROR: `)[1]}`,
                stack: proc.lastTrace
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

    proc.on(`close`, () => {
        string = null;
    })
}

module.exports = {
    ffmpegPath: null,
    sendUpdates,
    hasFFmpeg: () => refreshFFmpeg(),
    hasFFmpegPromise: () => refreshFFmpegPromise(),
    sanitizePath: (...args) => sanitizePath(...args),
    additionalArguments: (args) => {
        if(!args || typeof args != `object` || typeof args.length != `number`) args = [];

        const returnArgs = [];

        const yargsResult = yargs(args).argv

        const parsed = Object.entries(yargsResult)

        parsed.filter(o => o[1]).forEach((o, i) => {
            if(o[0] != `$0` && o[0] != `_` && o[0].toLowerCase() == o[0]) {
                const str = [`--${o[0]}`, `${o[1]}`];
                //console.log(str, o[0], o[1])
                returnArgs.push(...str)
            }
        });

        if(yargsResult._ && yargsResult._.length > 0) returnArgs.push(...yargsResult._)

        return returnArgs;
    },
    unflatPlaylist: (extraArguments, info, customID, ignoreStderr) => new Promise(async res => {
        const id = customID || idGen(16);

        const instanceName = `unflatPlaylist-${id}`

        const manager = downloadManager.get(instanceName, {staggered: true, noSendErrors: true});

        if(downloadManager[instanceName].timeout) clearTimeout(downloadManager[instanceName].timeout);

        manager.set({ concurrentDownloadsMult: 2 })

        manager.queueAction(manager.queue.queue.map(o => o.id), `remove`);
        manager.queueAction(manager.queue.complete.map(o => o.id), `remove`);
        manager.queueAction(manager.queue.paused.map(o => o.id), `remove`);

        manager.queueEventEmitter.removeAllListeners(`queueUpdate`);

        let newInfo = {};

        let badEntries = 0;

        manager.queueEventEmitter.on(`queueUpdate`, (queue) => {
            const totalLength = Object.values(queue).reduce((a, b) => a + b.length, 0);

            if(!ignoreStderr) {
                updateStatus(`Fetching info of ${queue.active.length + queue.paused.length + queue.queue.length}/${totalLength} items...`)
                updateStatusPercent([queue.complete.length == 0 ? -1 : queue.complete.length, totalLength]);
            }

            if(queue.complete.length == totalLength) {
                const failed = queue.complete.filter(o => o.failed);

                badEntries = badEntries - failed.length;

                console.log(`queue complete!`);

                newInfo = Object.assign(info, newInfo);

                if(!ignoreStderr) updateStatus(`Finished fetching info of ${queue.complete.length}/${totalLength} items!` + (failed > 0 ? ` (${failed} entries failed to resolve)` : ``) + (badEntries > 0 ? ` (${badEntries} entries failed to resolve)` : ``))

                res(module.exports.parseInfo(newInfo || info, true));

                if(!customID) downloadManager[instanceName].timeout = setTimeout(() => {
                    if(downloadManager[instanceName]) {
                        console.log(`deleting instance ${instanceName}`)
                        delete downloadManager[instanceName];
                    }
                }, 15000)
            }
        });

        if(info.url && !info.fullInfo) manager.createDownload([{query: info.url, extraArguments, ignoreStderr: true}, false], (i) => {
            if(i) {
                console.log(`new info!`)
                delete i.entries;
                newInfo = i;
            } else badEntries++;
        }, `listFormats`);

        if(info.entries) for(const i in info.entries.filter(e => e && !e.fullInfo)) {
            const e = info.entries[i];

            manager.createDownload([{query: e.url, extraArguments, ignoreStderr: true}, false], (e) => {
                // to keep the same order of songs
                if(e) {
                    console.log(`new info!`);
                    Object.assign(info.entries[i], module.exports.parseInfo(e, true));
                    console.log(`added "${e.title}" (id: ${e.id} / url: ${e.url}) to index ${i}`)
                } else badEntries++;
            }, `listFormats`);
        }

        manager.queueEventEmitter.emit(`queueUpdate`, manager.queue);
    }),
    verifyPlaylist: (d, { extraArguments, disableFlatPlaylist, forceRun, ignoreStderr }) => new Promise(async res => {
        if(typeof d == `object`) d = module.exports.parseInfo(d);
        if(d && forceRun) {
            console.log(`force run!`);
            module.exports.unflatPlaylist(extraArguments, d, null, ignoreStderr).then(res)
        } else if(d && d.fullInfo == true) {
            console.log(`full info found! resolving...`);
            res(d);
        } else if(d && d.formats) {
            console.log(`formats found! resolving...`);
            res(module.exports.parseInfo(d, true))
        } else if(d && d.entries) {
            console.log(`entries found! adding time objects...`);

            let anyNoTitle = false;

            for (entry of d.entries) {
                if(!entry || !entry.title || entry.title == entry.url) {
                    anyNoTitle = true;
                    break;
                }
            };

            if(anyNoTitle) {
                console.log(`Missing titles!`);
                //return module.exports.listFormats({query, extraArguments}, true).then(res)
                module.exports.unflatPlaylist(extraArguments, d, null, ignoreStderr).then(res)
            } else {
                res(module.exports.parseInfo(d, disableFlatPlaylist))
            }
        } else if(!disableFlatPlaylist) {
            updateStatus(`Restarting playlist search... (there were no formats returned!!)`)
            console.log(`no formats found! starting over...`);
            //return module.exports.listFormats({query, extraArguments}, true).then(res)
            module.exports.unflatPlaylist(extraArguments, d, null, ignoreStderr).then(res)
        } else {
            sendNotification({
                type: `error`,
                headingText: `Error getting media info`,
                bodyText: `Either the URL is invalid or the media is unavailable. Please try with a different link.`
            })
            return res(null);
        }
    }),
    parseOutputTemplate: (info, template) => {
        //if(!template) template = require(`../getConfig`)().outputFilename;
        if(!template) template = info.output_name || (global.lastConfig).outputFilename;

        //console.log(`template: ${template}`)
      
        template = template.replace(outputTemplateRegex, (match, key) => {
            const capturedKeys = key.split(`,`).map(s => s.trim())
            for (const key of capturedKeys) {
                if (info[key]) {
                    return info[key];
                }
            };

            if(key.includes(`|`) && info.fullInfo) {
                return key.split(`|`).slice(1).join(`|`).trim();
            } else return match;
        });
      
        return template;
    },
    parseMetadata: (d, playlistRoot=false) => {
        const genericURLRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

        const general = {
            title: d.title || d.webpage_url || d.url,
            artist: d.artist || d.album_artist || d.creator || d.uploader || d.channel,
            genre: d.genre,
            copyright: d.license || (d['playlist-media_metadata'] ? d['playlist-media_metadata'].general.copyright : null),
            comment: d.description || (d['playlist-media_metadata'] && d['playlist-media_metadata'].general.comment ? d['playlist-media_metadata'].general.comment : null),
        };

        const url = {
            source_url: d.webpage_url || d.url,
            artist_url: d.artist_url || d.creator_url || d.channel_url || d.uploader_url,
            thumbnail_url: d.thumbnails ? typeof d.thumbnails[d.thumbnails.length - 1] == `object` ? d.thumbnails[d.thumbnails.length - 1].url : `${d.thumbnails[d.thumbnails.length - 1]}` : null,
        };

        Object.entries(url).filter(o => typeof o[1] == `string` && !o[1].match(genericURLRegex)).forEach(o => { url[o[0]] = null; })

        return Object.assign(d, {
            media_metadata: {
                general,
                album: {
                    album: d.album || d.playlist_title || d['playlist-title'] || d.playlist_name || d.playlist || (d['playlist-media_metadata'] && d['playlist-media_metadata'].album.album ? d['playlist-media_metadata'].album.album : null),
                    album_artist: playlistRoot ? general.artist : (d['playlist-media_metadata'] && d['playlist-media_metadata'].general.artist ? d['playlist-media_metadata'].general.artist : null),
                    track: ((typeof d.entry_number == `number` && typeof (d['playlist-playlist_count'] || d.entry_total) == `number`) ? `${d.entry_number}/${d['playlist-playlist_count'] || d.entry_total}` : null),
                },
                url,
            }
        })
    },
    getSavePath: (info, filePath) => {
        const slash = require('os').platform() == `win32` ? `\\` : `/`;

        const { saveLocation, downloadInWebsiteFolders } = global.lastConfig;

        if(info.url == `*`) return (`*` + slash);

        let useSaveLocation;

        if(info._platform == `file`) {
            useSaveLocation = info.url.split(`\\`).join(`/`).split(`/`);
            if(info.extractor == `system:file`) useSaveLocation = useSaveLocation.slice(0, -1);
        } else {
            useSaveLocation = saveLocation.split(`\\`).join(`/`).split(`/`);
        }

        const paths = [ sanitizePath(...useSaveLocation) ];

        let parsedURL = require(`url`).parse(info._original_url || info.url || info.webpage_url || info._request_url || ``);

        let useURL = parsedURL.host ? parsedURL.host.split(`.`).slice(-2).join(`.`) : info.webpage_url_domain || null;

        //if(downloadInWebsiteFolders && info._platform == `file`) paths.push(`Converted`);

        if(downloadInWebsiteFolders && useURL) paths.push(useURL);

        if(filePath) paths.push(filePath)

        let saveTo = sanitizePath(...paths) + slash;

        if(process.platform != `win32` && !saveTo.startsWith(slash)) saveTo = slash + saveTo

        console.log(`-- saveTo: ${saveTo}`)

        return saveTo
    },
    parseInfo: (d, full, root=true, rawInfo=d, entry_number, entry_total) => {
        if(!d.title) d.title = d.webpage_url;
        if(!d.title) d.title = d.url;

        if(!d._original_url) d._original_url = d.webpage_url || d.url || d._request_url;

        if(!d.playlist_count && d.entries) d.playlist_count = d.entries.length;

        if(full && root && !d.fullInfo) d.fullInfo = true;

        if(!d.originalDuration && d.duration) d.originalDuration = d.duration;

        let totalTime = 0;

        if(typeof entry_number == `number` && !root) d.entry_number = entry_number;
        if(typeof entry_total == `number` && !root) d.entry_total = entry_total;

        if(d.duration && !root) totalTime += typeof d.duration == `object` ? d.duration.units.ms : d.duration*1000;

        if(!d.thumbnail && d.thumbnails && d.thumbnails.length > 0) {
            d.thumbnail = typeof d.thumbnails[d.thumbnails.length - 1] == `object` ? d.thumbnails[d.thumbnails.length - 1].url : `${d.thumbnails[d.thumbnails.length - 1]}`
        }

        module.exports.parseMetadata(d, root);

        const parseList = (o, i, key) => {
            if(o && typeof o == `object`) {
                totalTime += (o.originalDuration ? o.originalDuration * 1000 : 0) || (typeof o.duration == `number` ? o.duration*1000 : typeof o.duration == `object` && o.duration?.units?.ms ? o.duration.units.ms : 0) || 0;
                return module.exports.parseInfo(o, full, false, rawInfo, typeof i == `number` ? i+1 : null, i ? d[key].length : null);
            } else return o;
        }

        if(d.entries) d.entries = d.entries.map((o, i) => parseList(o, i, `entries`));

        if(d.formats) {
            const modifiedFormats = d.formats.map(o => {
                if(o.audio_ext != `none` || o.acodec != `none` || o.asr || o.audio_channels) {
                    o.audio = true;
                } else {
                    o.audio = false;
                }

                if(o.aspect_ratio || o.fps || o.height || o.width || o.resolution != `audio only` || o.vcodec != `none` || o.video_ext != `none`) {
                    o.video = true;
                } else {
                    o.video = false;
                };

                return o;
            });

            const sortByQuality = (a, b) => {
                // go by a.quality and b.quality, higher should go first
                // if there is no quality, send before the ones with quality
                if(a.quality && b.quality) {
                    if(a.quality == b.quality) {
                        return 0;
                    } else if(a.quality > b.quality) {
                        return -1;
                    } else if(a.quality < b.quality) {
                        return 1;
                    }
                } else if(a.quality) {
                    return -1;
                } else if(b.quality) {
                    return 1;
                } else return 0;
            }

            d.formats = [...modifiedFormats.filter(o => o.audio && o.video).sort(sortByQuality), ...modifiedFormats.filter(o => o.audio && !o.video).sort(sortByQuality), ...modifiedFormats.filter(o => !o.audio && o.video).sort(sortByQuality), ...modifiedFormats.filter(o => !o.audio && !o.video).sort(sortByQuality)];
        }

        d.duration = time(totalTime || (d.originalDuration ? d.originalDuration*1000 : 0) || 0);

        const key = d.ie_key || d.extractor_key || (d.extractor ? d.extractor.split(`:`).slice(-1)[0][0].toUpperCase() + d.extractor.split(`:`).slice(-1)[0].slice(1) : null) || ``;

        d.ezytdl_key = key;

        if(key.endsWith(`User`) && typeof d.originalDuration != `number`) {
            d.ezytdl_type = `user`;
        } else if(d.entries || d._type == `playlist`) {
            d.ezytdl_type = `playlist`;
        } else if(typeof d.originalDuration == `number`) {
            if(d.formats && typeof d.formats == `object` && d.formats.filter(f => f.video).length > 0) {
                d.ezytdl_type = `video`;
            } else if(d.formats && typeof d.formats == `object` && d.formats.filter(f => f.audio).length > 0) {
                d.ezytdl_type = `audio`;
            } else d.ezytdl_type = `media`;
        } else {
            d.ezytdl_type = `link`;
        };

        d.ezytdl_key_type = key.split(/(?=[A-Z])/).slice(-1)[0];

        if(!root && rawInfo) {
            for(const key of Object.keys(rawInfo)) {
                if(rawInfo[key]) d[`playlist-${key}`] = rawInfo[key];
            }
        }

        d.saveLocation = module.exports.getSavePath(d);

        d.output_name = module.exports.getFilename(d._original_url, d, null, null, false);

        return module.exports.parseMetadata(d, root);
    },
    search: ({query, count, from, extraArguments, noVerify, forceVerify, ignoreStderr}) => new Promise(async res => {
        if(!count) count = 10;

        const additional = module.exports.additionalArguments(extraArguments);

        //console.log(`query "${query}"; count: ${count}; additional args: "${additional.join(`", "`)}"`)

        let args = [`--dump-single-json`, `--quiet`, `--verbose`, `--flat-playlist`, `--playlist-end`, `${count}`, ...additional];

        const encoded = encodeURIComponent(query);

        if(from == `youtubemusic`) {
            forceVerify = true;
            args.unshift(`https://music.youtube.com/search?q=${encoded}&sp=EgIQAQ%253D%253D`)
        } else if(from == `soundcloud`) {
            args.unshift(`scsearch${count}:${query}`)
        } else {
            args.unshift(`https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%253D%253D`)
        }

        console.log(`search args: "${args.map(s => s.includes(` `) ? `'${s}'` : s).join(` `)}"`)

        const proc = execYTDLP(args, { persist: false });

        let data = ``;

        if(!ignoreStderr) sendUpdates(proc, `Starting search for "${query}"`);

        proc.stdout.on(`data`, d => {
            //console.log(`output`, d.toString())
            data += d.toString().trim();
        });

        proc.on(`error`, e => {
            console.log(e)
        })

        proc.on(`close`, code => {
            console.log(`search closed with code ${code}`)

            try {
                const d = Object.assign(JSON.parse(data), { _request_url: query });

                if(noVerify) {
                    return res(d);
                } else module.exports.verifyPlaylist(d, { disableFlatPlaylist: false, extraArguments, forceRun: forceVerify, ignoreStderr }).then(res);
            } catch(e) {
                console.error(`${e}`)
                if(!ignoreStderr) sendNotification({
                    type: `error`,
                    headingText: `Error getting media info`,
                    bodyText: `There was an issue retrieving the info. Please try again.`
                })
                return res(null);
            }
        })
    }),
    ffprobeInfo: (path, ffprobePathProvided) => new Promise(async res => {
        const ffprobePath = ffprobePathProvided || (await require(`./filenames/ffmpeg`).getFFprobePromise());

        if(!ffprobePath) {
            if(!ffprobePathProvided) sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `FFprobe is not installed. Please install FFmpeg in settings (or on your system) and try again.`,
                hideReportButton: true,
                redirect: `settings.html`,
                redirectMsg: `Go to settings`
            });

            return res(null)
        };

        if(!await pfs.existsSync(path)) {
            if(!ffprobePathProvided) sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `The path does not exist.`,
            });
            
            return res(null)
        };

        const args = [`-v`, `quiet`, `-print_format`, `json`, `-show_format`, `-show_streams`, path];

        console.log(`getting info of "${path}" -- "${args.join(`" "`)}"`);

        const info = {};

        const proc = child_process.execFile(ffprobePath, args);
        
        if(!ffprobePathProvided) updateStatus(`Retrieving file info for "${path}"`);

        let data = ``;

        proc.stdout.on(`data`, d => data += d.toString().trim());

        proc.on(`close`, (code) => {
            console.log(`ffprobeInfo closed with code ${code}`, data);

            if(code != 0) return res(null);

            if(!ffprobePathProvided) updateStatus(`Parsing data...`);

            try {
                const obj = JSON.parse(data);

                if(!obj.streams || obj.streams.length == 0) {
                    if(!ffprobePathProvided) sendNotification({
                        type: `error`,
                        headingText: `Error getting info`,
                        bodyText: `There were no streams found from the given path. If you meant to view the contents of a folder, please select the folder instead.`
                    });
                    return res(null);
                }

                if(obj.format) {
                    if(obj.format.tags) Object.assign(info, obj.format.tags);
                    if(obj.format.tags && obj.format.tags.comment) info.description = obj.format.tags.comment;
                    if(obj.format.duration) info.duration = Number(obj.format.duration);
                };

                if(!info.title) info.title = require(`path`).basename(path);

                if(obj.streams) {
                    info.formats = [];
                    for(const stream of obj.streams) {
                        console.log(`stream`, stream)

                        const format = {
                            format_id: `${stream.codec_type}-${stream.codec_name}-${stream.index}`,
                            format_note: stream.codec_type,
                            format_index: stream.index,
                            ext: stream.codec_name,
                        };

                        if(stream.codec_name && stream.codec_type == `audio`) {
                            format.acodec = stream.codec_name;

                            if(stream.sample_rate) format.asr = stream.sample_rate;
                            if(stream.channels) format.audio_channels = stream.channels;
                            if(stream.bit_rate) format.abr = stream.bit_rate;
                        } else {
                            format.vcodec = stream.codec_name;

                            if(stream.width && stream.height) format.resolution = `${stream.width}x${stream.height}`;
                            if(stream.width) format.width = stream.width;
                            if(stream.height) format.height = stream.height;
                            if(stream.bit_rate) format.vbr = stream.bit_rate;
                            if(stream.fps) format.fps = stream.fps;
                            if(stream.display_aspect_ratio) format.aspect_ratio = stream.display_aspect_ratio;
                        };

                        info.formats.push(format);
                    }
                }

                res(module.exports.parseInfo(Object.assign(info, {
                    url: path,
                    extractor: `system:file`,
                    extractor_key: `SystemFile`,
                    _platform: `file`,
                }), true));
            } catch(e) {
                console.error(e)
                if(!ffprobePathProvided) sendNotification({
                    type: `error`,
                    headingText: `Error getting info`,
                    bodyText: `There was an issue retrieving the info.\n\n${e}`
                })
                return res(null);
            }
        });
    }),
    ffprobeFiles: (path, files) => new Promise(async res => {
        const ffprobePath = await require(`./filenames/ffmpeg`).getFFprobePromise();

        if(!ffprobePath) {
            sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `FFprobe is not installed. Please install FFmpeg in settings (or on your system) and try again.`,
                hideReportButton: true,
                redirect: `settings.html`,
                redirectMsg: `Go to settings`
            });

            return res(null)
        };

        const noPath = !path;

        if(!path) path = (await require(`../getConfig`)()).saveLocation;

        const instanceName = `ffprobeFiles-${idGen(16)}`

        const manager = downloadManager.get(instanceName, { staggered: false, noSendErrors: true });

        if(downloadManager[instanceName].timeout) clearTimeout(downloadManager[instanceName].timeout);

        manager.queueAction(manager.queue.queue.map(o => o.id), `remove`);
        manager.queueAction(manager.queue.complete.map(o => o.id), `remove`);
        manager.queueAction(manager.queue.paused.map(o => o.id), `remove`);

        manager.queueEventEmitter.removeAllListeners(`queueUpdate`);

        let newInfo = {
            title: noPath ? `${files.length} files` : require(`path`).basename(path),
            extractor: `system:folder`,
            extractor_key: `SystemFolder`,
            entries: files.map(o => ({ url: o })),
            url: noPath ? `*` : path,
            _platform: `file`,
        };

        let badEntries = 0;
        let skipped = 0;

        for(const location of files) {
            const remove = () => {
                badEntries++;
                const i = newInfo.entries.findIndex(o => o.url == location);
                if(i != -1) newInfo.entries.splice(i, 1)
            };

            try {
                const stat = await pfs.statSync(location);
                console.log(`stat ${location}: ${stat.isDirectory()} / ${stat.isFile()}`)
                if(!stat.isDirectory() && stat.isFile()) {
                    manager.createDownload([location, ffprobePath], (i) => {
                        if(i) {
                            delete i.entries;
                            Object.assign(newInfo.entries.find(o => o.url == location), i);
                        } else {
                            remove();
                        }
                    }, `ffprobeInfo`)
                } else {
                    remove();
                    skipped++;
                }
            } catch(err) {
                remove();
            };
        }

        manager.queueEventEmitter.on(`queueUpdate`, (queue) => {
            const totalLength = Object.values(queue).reduce((a, b) => a + b.length, 0);

            updateStatus(`Fetching info of ${queue.active.length + queue.paused.length + queue.queue.length}/${totalLength} items...`)
            updateStatusPercent([queue.complete.length == 0 ? -1 : queue.complete.length, totalLength]);

            if(queue.complete.length == totalLength) {
                const failed = queue.complete.filter(o => o.failed);

                badEntries = badEntries - failed.length - skipped;

                console.log(`queue complete!`);

                updateStatus(`Finished fetching info of ${queue.complete.length}/${totalLength} items!` + (failed > 0 ? ` (${failed} entries not compatible)` : ``) + (badEntries > 0 ? ` (${badEntries} entries failed to resolve)` : ``) + (skipped > 0 ? ` (${skipped} folders skipped)` : ``))

                const parsed = module.exports.parseInfo(newInfo, true);

                res(parsed);

                downloadManager[instanceName].timeout = setTimeout(() => {
                    if(downloadManager[instanceName]) {
                        console.log(`deleting instance ${instanceName}`)
                        delete downloadManager[instanceName];
                    }
                }, 15000)
            }
        });

        manager.queueEventEmitter.emit(`queueUpdate`, manager.queue);
    }),
    ffprobeDir: (path) => new Promise(async res => {
        const ffprobePath = await require(`./filenames/ffmpeg`).getFFprobePromise();

        if(!ffprobePath) {
            sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `FFprobe is not installed. Please install FFmpeg in settings (or on your system) and try again.`,
                hideReportButton: true,
                redirect: `settings.html`,
                redirectMsg: `Go to settings`
            });

            return res(null)
        };

        if(!await pfs.existsSync(path)) {
            sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `The path does not exist.`,
            });
            
            return res(null)
        };

        const files = await pfs.readdirSync(path);

        module.exports.ffprobeFiles(path, files.map(o => require(`path`).join(path, o))).then(res)
    }),
    ffprobe: (path) => new Promise(async res => {
        const ffprobePath = await require(`./filenames/ffmpeg`).getFFprobePromise();

        if(!ffprobePath) {
            sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `FFprobe is not installed. Please install FFmpeg in settings (or on your system) and try again.`,
                hideReportButton: true,
                redirect: `settings.html`,
                redirectMsg: `Go to settings`
            });

            return res(null)
        };

        if(typeof path == `string` && !(await pfs.existsSync(path))) {
            sendNotification({
                type: `error`,
                headingText: `Error getting info`,
                bodyText: `The path does not exist.`,
            });
            
            return res(null)
        };

        console.log(`path:`, path)

        if(typeof path == `object` && typeof path.length == `number`) {
            return module.exports.ffprobeFiles(null, path).then(res);
        } else {
            const stat = await pfs.statSync(path);
    
            if(stat.isDirectory()) {
                return module.exports.ffprobeDir(path).then(res);
            } else if(stat.isFile()) {
                return module.exports.ffprobeInfo(path).then(res);
            } else return res(null);
        }
    }),
    listFormats: ({query, extraArguments, ignoreStderr}) => new Promise(async res => {
        const additional = module.exports.additionalArguments(extraArguments);

        console.log(`url "${query}"; additional args: "${additional.join(`", "`)}"`)

        let args = [query, `--dump-single-json`, `--flat-playlist`, `--quiet`, `--progress`, `--verbose`, ...additional];

        if(ignoreStderr) args.splice(args.indexOf(`--verbose`), 1);

        const proc = execYTDLP(args, { persist: false });

        let data = ``;

        if(!ignoreStderr) sendUpdates(proc, `Starting info query of "${query}"`);

        proc.stdout.on(`data`, d => {
            //console.log(`output`, d.toString())
            data += d.toString().trim();
        });

        proc.on(`error`, e => {
            console.log(e)
        })

        proc.on(`close`, code => {
            console.log(`listFormats closed with code ${code} (${query})`)

            try {
                const d = Object.assign(JSON.parse(data), { _request_url: query });

                if(ignoreStderr) {
                    return res(d);
                } else module.exports.verifyPlaylist(d, { disableFlatPlaylist: false, ignoreStderr }).then(res);
                //console.log(d)
            } catch(e) {
                console.error(`${e}`)
                if(!ignoreStderr) sendNotification({
                    type: `error`,
                    headingText: `Error getting media info`,
                    bodyText: `There was an issue retrieving the info. Please try again.`
                })
                return res(null);
            }
        })
    }),
    getFilename: (url, info, format, template, fullParse) => {
        //const { outputFilename } = require(`../getConfig`)();
        const { outputFilename } = global.lastConfig;

        let useTempalte = template || outputFilename;

        //console.log(`getFilename / raw: "${useTempalte}"`)

        useTempalte = module.exports.parseOutputTemplate(Object.assign({}, (typeof format == `object` ? format : {}), info), useTempalte);

        //console.log(`getFilename / before: "${useTempalte}"`)

        if(outputTemplateRegex.test(useTempalte) && fullParse && info._platform != `file`) {
            return new Promise(async res => {
                //console.log(`getFilename / template needs to be parsed!`)
    
                const args = [url, `-o`, useTempalte, `--get-filename`, `--quiet`];
        
                if(format && format.format_id) args.unshift(`-f`, format.format_id)
                else if(typeof format == `string`) args.unshift(`-f`, format)
        
                //console.log(args)
        
                const proc = execYTDLP(args);
        
                let data = ``;
        
                proc.stderr.on(`data`, d => {
                    //console.log(d.toString().trim())
        
                    if(d.toString().trim().startsWith(`ERROR: `)) {
                        if(!format) {
                            sendNotification({
                                type: `error`,
                                headingText: `failed to retrieve filename of ${url}: ${d.toString().trim()}`,
                                bodyText: `${d.toString().trim().split(`ERROR: `)[1]}`
                            })
                        } else {
                            proc.kill(`SIGKILL`);
                            return module.exports.getFilename(url, info, null, template, noParse).then(res)
                        }
                    }
                })
        
                proc.stdout.on(`data`, d => {
                    //console.log(`output`, d.toString())
                    data += d.toString().trim();
                });
        
                //proc.stderr.on(`data`, d => {
                //    console.log(d.toString().trim())
                //})
                
                proc.on(`close`, code => {
                    //console.log(`getFilename / getFilename closed with code ${code}`);
                    console.log(data)
                    //console.log(`getFilename / after: "${data}"`)
                    res(data)
                })
            })
        } else {
            //console.log(`getFilename / no need to parse template! (or noParse is true)`)

            useTempalte = useTempalte.replace(outputTemplateRegex, () => `${`Unknown`}`)

            //console.log(`getFilename / after: "${useTempalte}"`)

            return useTempalte
        }
    },
    getCodec: (file, audio) => new Promise(async res => {
        let ffprobePath = await require(`./filenames/ffmpeg`).getFFprobePromise();
        
        if(ffprobePath && await pfs.existsSync(ffprobePath) && file) {
            try {
                child_process.execFile(ffprobePath, [`-v`, `error`, `-select_streams`, `${audio ? `a` : `v`}`, `-show_entries`, `stream=codec_name`, `-of`, `default=noprint_wrappers=1:nokey=1`, file], (err, stdout, stderr) => {
                    if(err) {
                        console.error(err);
                        return res(null);
                    } else {
                        let a = stdout.toString().trim();
                        if(a/* && !a.includes(`jpeg`) && !a.includes(`png`) && !a.includes(`gif`)*/) {
                            return res(a.trim().split(`\n`)[0])
                        } else return res(null);
                    }
                });
            } catch(e) {
                return res(null);
            }
        } else return res(null)
    }),
    getResolution: (path) => new Promise(async res => {
        const proc = child_process.execFile((await require(`./filenames/ffmpeg`).getFFprobePromise()), [`-v`, `error`, `-select_streams`, `v:0`, `-show_entries`, `stream=width,height`, `-of`, `csv=s=x:p=0`, path]);

        let output = ``;

        proc.stdout.on(`data`, d => output += d.toString().trim() + `\n`);

        proc.on(`close`, () => {
            if(output) {
                const split = output.split(`x`);

                if(split.length == 2) {
                    const width = Number(split[0]);
                    const height = Number(split[1]);

                    if(width && height) {
                        return res({ width, height });
                    } else return res({ width: null, height: null });
                } else return res({ width: null, height: null });
            } else return res({ width: null, height: null });
        })
    }),
    getMuxer: (ext) => new Promise(async res => {
        const proc = child_process.execFile(module.exports.ffmpegPath, [`-h`, `muxer=` + ext]);

        let output = ``;

        proc.stdout.on(`data`, d => output += d.toString().trim() + `\n`);

        proc.on(`close`, () => {
            const resObj = {}

            if(output.includes(`Muxer `)) resObj.name = output.split(`Muxer `)[1].split(` `)[0].trim();
            if(output.includes(`Mime type: `)) resObj.mimeType = output.split(`Mime type: `)[1].split(`\n`)[0].trim().slice(0, -1);
            if(output.includes(`video codec: `)) resObj.videoCodec = output.split(`video codec: `)[1].split(`\n`)[0].trim().slice(0, -1);
            if(output.includes(`audio codec: `)) resObj.audioCodec = output.split(`audio codec: `)[1].split(`\n`)[0].trim().slice(0, -1);

            if(Object.keys(resObj).length == 0) {
                resObj.compatible = false;
            } else {
                resObj.compatible = true;
            }

            if(resObj.videoCodec && (resObj.videoCodec.includes(`jpeg`) || resObj.videoCodec.includes(`png`) || resObj.videoCodec.includes(`gif`))) delete resObj.videoCodec;

            resObj.codec = resObj.videoCodec || resObj.audioCodec;

            console.log(`codecs:`, resObj);

            res(resObj);
        });
    }),
    getHardwareTranscoders: (encode, transcoders, codec) => {
        return codec ? Object.values(transcoders).filter(o => {
            if(typeof o == `object`) {
                const str = codec + `_` + o.string;
                const regex = /\(\s*([^)]+)\s*\)/g

                let valid = false;

                let use = (encode ? ffmpegRawVideoCodecsEncodeOutput : ffmpegRawVideoCodecsDecodeOutput).filter(s => s.includes(codec));
                let useRegex = (encode ? ffmpegRawVideoCodecsEncodeOutput : ffmpegRawVideoCodecsDecodeOutput).filter(s => s.includes(codec) && s.match(regex));

                if(useRegex.length > 0) {
                    for(const s of useRegex) {
                        for(const match of s.match(regex)) {
                            if(match.includes(encode ? `encoders` : `decoders`) && match.includes(str)) {
                                valid = true;
                                break;
                            }
                        };
    
                        if(valid) break;
                    }
                } else {
                    for(const s of use) {
                        if(s.includes(str)) valid = true;
    
                        if(valid) break;
                    }
                };

                console.log(`found in ${useRegex.length > 0 ? `useRegex` : `use`} ${str} - ${valid}`)

                return valid
            } else return false;
        }).map(o => {
            return Object.assign({}, o, {
                pre: o.pre.includes(`-c:v`) ? o.pre.map(s => s.startsWith(`h264_`) ? `${codec}_${s.split(`_`).slice(1).join(`_`)}` : s) : [...o.pre, `-c:v`, `${codec}_${o.string}`],
                post: o.post.includes(`-c:v`) ? o.post.map(s => s.startsWith(`h264_`) ? `${codec}_${s.split(`_`).slice(1).join(`_`)}` : s) : [...o.post, `-c:v`, `${codec}_${o.string}`],
                codecName: codec + `_` + o.string
            })
        }) : [];
    },
    download: ({url, format, ext, convert, filePath, addMetadata, info, extraArguments}, updateFunc) => new Promise(async resolve => {
        const temporaryFilename = `ezytdl-` + idGen(24);
        
        let obj = {};

        let proc;

        let update = (o) => {
            Object.assign(obj, o);
            const updateObj = { latest: (o || obj), overall: obj }
            updateFunc(updateObj, proc);
            return updateObj;
        };

        let setProgress = (key, o) => {
            //Object.assign(obj, { progressBars: Object.assign({}, obj.progressBars, { [key]: o }) });
            //return update({ [`progress-${key}`]: o })
            return update({ status: o.status || obj.status, progress: o.progress || obj.progress });
        };

        let deleteProgress = (key) => {
            //Object.assign(obj, { progressBars: Object.assign({}, obj.progressBars, { [key]: null }) });
            if(obj[`progress-${key}`]) delete obj[`progress-${key}`];
            return update({})
        }
        
        if(info && info._needs_original) {
            console.log(`info needs original!`);
            update({status: `Finding equivalent on supported platform...`});

            const equiv = await module.exports.findEquivalent(Object.assign({}, info, { url }), true, false)

            Object.assign(info, {
                url: equiv.url || equiv.webpage_url || equiv._request_url
            });

            url = info.url;
        }

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

                if(findFiles) {
                    fs.readdir(saveTo, (err, dir) => {
                        if(err) {
                            console.log(`failed to read directory ${saveTo}: ${err}`)
                        } else {
                            const prevFiles = dir.filter(f => f.startsWith(findFiles));
                            //console.log(`${from} / files:`, prevFiles, `from:`, dir, `starting with:`, findFiles);
            
                            prevFiles.forEach(f => {
                                const file = require(`path`).join(saveTo, f);
                                update({status: `Removing ${from} file ${file} ...`})
                                //console.log(`removing previous ${from} file ${file}`);
                                try {
                                    if(fs.existsSync(file)) {
                                        //console.log(`removing ${file}...`)
                                        fs.unlinkSync(file)
                                    }// else console.log(`${file} nonexistent?`)
                                } catch(e) {
                                    console.log(`failed removing ${file}: ${e}`)
                                }
                            });
            
                            if(fs.existsSync(saveTo + filename)) {
                                //console.log(`original file removing...`)
                                fs.unlinkSync(saveTo + filename);
                            } else console.log(`original file nonexistent?`)
                        }
                    });
                }
            };

            filenames.forEach((f, i) => {
                console.log(`purging files from index ${i}: ${f}`)
                purgeFiles(`${i}`, f)
            });

            resolve(update({status: `Download canceled.`}))
        }

        const fetchFullInfo = (status) => new Promise(async res => {
            if(info.fullInfo) {
                return res(true);
            } else {
                if(status) update({status})
                try {
                    //const i = await module.exports.listFormats({query: url, ignoreStderr: true}, true);
                    const i = await module.exports.unflatPlaylist(null, info, `fetchFullInfo`);
                    Object.assign(info, i, {
                        fullInfo: true
                    });
                    res(true);
                } catch(e) {
                    sendNotification({
                        type: `warn`,
                        headingText: `Failed to get full media info`,
                        bodyText: `There was an issue retrieving the info. Please try again.`
                    })
                    res(false);
                }
            }
        })

        try {
            const currentConfig = await require(`../getConfig`)();

            const { disableHWAcceleratedConversion, outputFilename, hardwareAcceleratedConversion, advanced } = currentConfig;

            //console.log(`download started! (url: ${url})`, info)

            let { onlyGPUConversion } = currentConfig;

            let thisFormat;

            if(format == `bv*+ba/b`/* && (!module.exports.ffmpegPath || !convert)*/) format = null;

            if(info.is_live && (format == `bv*+ba/b` || format == `bv` || format == `ba`)) format = null;

            if(info.formats) {
                if(info.is_live && !info.formats.find(f => f.format_id == format)) {
                    format = null;
                    thisFormat = info.formats[0]
                } else thisFormat = info.formats.find(f => f.format_id == format) || info.formats[0]
            }

            const fullYtdlpFilename = sanitize(await new Promise(res => {
                if(info._platform == `file` && convert) {
                    const parsed = require(`path`).parse(url);
                    res(`${parsed.name} - converted-${info.selectedConversion ? info.selectedConversion.key : `customconversion`}-${Date.now()}` + (convert.ext ? `.${convert.ext}` : parsed.ext))
                } else {
                    const filename = module.exports.getFilename(url, info, thisFormat, outputFilename + `.%(ext)s`, true);
                    if(filename.then) {
                        return filename.then(res)
                    } else return res(filename);
                }
            }))

            const ytdlpSaveExt = fullYtdlpFilename.split(`.`).slice(-1)[0];

            let ytdlpFilename = fullYtdlpFilename.split(`.`).slice(0, -1).join(`.`);

            if(!thisFormat) thisFormat = {
                ext: ytdlpSaveExt,
                format_id: `unknown`,
                format_note: `unknown`,
                format: `unknown`,
                url
            };

            thisFormat.format_id = format || thisFormat.format_id;
            
            filenames.push(fullYtdlpFilename)
            filenames.push(temporaryFilename)
    
            if(!module.exports.ffmpegPath || !ffmpegVideoCodecs) {
                console.log(`ffmpeg not installed or codecs not present! refreshing...`);
                await refreshFFmpegPromise();
                console.log(`ffmpeg refreshed!`)
            }
    
            //console.log(saveLocation, filePath, ytdlpFilename)

            const saveTo = module.exports.getSavePath(info, filePath);

            update({ deleteFiles: () => purgeLeftoverFiles(saveTo), live: info.is_live ? true : false, destinationFilename: ytdlpFilename, formatID: format })
    
            console.log(`saveTo: ${saveTo} (making dir)`)

            await pfs.mkdirSync(saveTo, { recursive: true, failIfExists: false });

            console.log(`saveTo: ${saveTo} (made dir)`)
    
            let reasonConversionNotDone = null;
        
            killAttempt = 0;

            const additionalArgs = module.exports.additionalArguments(typeof extraArguments == `string` ? extraArguments : ``);

            let args = [...additionalArgs];

            const res = async () => {
                update({ percentNum: 100 });
                const resolveStatus = obj.status;
                const skipped = {};
                new Promise(async r => {
                    let run = true;

                    if(killAttempt > 0) run = false;

                    const file = (await pfs.readdirSync(saveTo)).find(f => f.startsWith(ytdlpFilename) && !f.endsWith(`.meta`));
                    const target = file ? require(`path`).join(saveTo, file) : null;

                    const isWritable = () => new Promise(async res => {
                        try {
                            await pfs.accessSync(target, fs.constants.W_OK);
                            return res(true);
                        } catch (err) {
                            return res(false);
                        }
                    })

                    if(run && addMetadata && module.exports.ffmpegPath && file && (await pfs.existsSync(target))) {
                        console.log(`adding metadata...`)

                        let totalTasks = Object.values(addMetadata).filter(v => v).length + 1;
                        let current = 0;

                        const updateTask = (o) => {
                            current++;
                            update(Object.assign({}, o, {percentNum: Math.round((current/totalTasks) * 100)}))
                        }

                        let n = 0;

                        while(!(await isWritable())) {
                            n++;
                            update({status: `Waiting for file to unlock for metadata... (${n}/10)`})
                            if(n > 10) break;
                            await new Promise(r => setTimeout(r, 1000));
                        };

                        if(n > 10) {
                            console.log(`file still locked after 10 attempts!`)
                            Object.entries(addMetadata).filter(v => v[1]).forEach(k => skipped[k[0]] = `File was locked (10 attempts were made).`);
                        } else {
                            const cleanup = (restoreOriginal) => new Promise(async res => {
                                if((await pfs.existsSync(target + `.ezytdl`)) && !(await pfs.existsSync(target))) {
                                    update({status: `Restoring original file...`})
                                    console.log(`-- restoring ${target + `.ezytdl`}...`)
                                    await pfs.renameSync(target + `.ezytdl`, target);
                                } else if((await pfs.existsSync(target + `.ezytdl`)) && (await pfs.existsSync(target))) {
                                    if(restoreOriginal) {
                                        update({status: `Rolling back changes...`})
                                        console.log(`-- restoring ${target}...`)
                                        if(await pfs.existsSync(target)) await pfs.unlinkSync(target);
                                        await pfs.renameSync(target + `.ezytdl`, target);
                                    } else {
                                        update({status: `Removing temporary file...`})
                                        console.log(`-- removing ${target + `.ezytdl`}...`)
                                        if(await pfs.existsSync(target + `.ezytdl`)) await pfs.unlinkSync(target + `.ezytdl`);
                                    }
                                }
                                
                                if(await pfs.existsSync(target + `.songcover`)) {
                                    update({status: `Removing temporary thumbnail file...`})
                                    console.log(`-- removing ${target + `.songcover`}...`)
                                    await pfs.unlinkSync(target + `.songcover`);
                                }
                                
                                if(await pfs.existsSync(target + `.png`)) {
                                    update({status: `Removing temporary thumbnail file...`})
                                    console.log(`-- removing ${target + `.png`}...`)
                                    await pfs.unlinkSync(target + `.png`);
                                }

                                res();
                            })
                            
                            if(addMetadata.tags) await new Promise(async r => {
                                try {
                                    await pfs.renameSync(target, target + `.ezytdl`);
        
                                    let tags = [];
    
                                    if(!info.fullInfo) {
                                        setProgress(`tags`, {progressNum: -1, status: `Getting full metadata...`})
                                        //update({status: `Getting full metadata...`})
                                        await fetchFullInfo();
                                    }
    
                                    tags = [];
    
                                    const general = Object.entries(info.media_metadata.general).filter(v => v[1]);
                                    const album = Object.entries(info.media_metadata.album).filter(v => v[1]);
                                    //const url = Object.entries(info.media_metadata.url).filter(v => v[1]);
    
                                    for(const entry of general) tags.push([entry[0], entry[1]]);
    
                                    if(addMetadata['opt-saveAsAlbum']) for(const entry of album) tags.push([entry[0], entry[1]]);
    
                                    /*if(info.track || info.title) tags.push([`title`, info.track || info.title]);
                                    if(info.artist || info.album_artist || info.creator || info.uploader || info.channel) tags.push([`artist`, info.artist || info.album_artist || info.creator || info.uploader || info.channel]);
    
                                    if(addMetadata['opt-saveAsAlbum']) {
                                        if(info.album || info['playlist-title']) tags.push([`album`, info.album || info['playlist-title']]);
                                        if((info.entry_number) && (info[`playlist-playlist_count`] || info.entry_total)) tags.push([`track`, `${info.entry_number}/${info[`playlist-playlist_count`] || info.entry_total}`]);
                                    }
    
                                    if(info.genre) tags.push([`genre`, info.genre]);
                                    if(info.license) tags.push([`copyright`, info.license]);
                                    if(info.description) tags.push([`comment`, info.description]);*/
                                    
                                    setProgress(`tags`, {progressNum: 30, status: `Adding ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}...`})
                                    //update({status: `Adding ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}...`})
        
                                    const meta = [];
        
                                    tags.forEach(t => meta.push(`-metadata`, `${t[0]}=${`${t[1]}`.replace(/\n/g, `\r\n`)}`));
            
                                    const args = [`-y`, `-ignore_unknown`, `-i`, target + `.ezytdl`, `-id3v2_version`, `3`, `-write_id3v1`, `1`, ...meta, `-c`, `copy`, target];
            
                                    ////console.log(args);
            
                                    const proc = child_process.execFile(module.exports.ffmpegPath, args);
    
                                    proc.once(`spawn`, () => {
                                        setProgress(`tags`, {progressNum: 50, status: `Adding ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}... (FFmpeg spawned)`})
                                        //update({status: `Adding ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}... (FFmpeg spawned)`})
                                    })
            
                                    proc.on(`error`, e => {
                                        console.error(e)
        
                                        skipped.tags = `${e}`;
        
                                        cleanup(true).then(r)
                                    });
            
                                    proc.on(`close`, code => {
                                        console.log(`metadata added! (code ${code})`)
                                        setProgress(`tags`, {progressNum: 100, status: `Added ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}`})
                                        //update({status: `Added ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}`})
                                        cleanup(code === 0 ? false : true).then(r)
                                    })
                                } catch(e) {
                                    console.error(e)
        
                                    skipped.tags = `${e}`;
        
                                    cleanup(true).then(r)
                                }
                            });

                            const foundCodec = await module.exports.getCodec(target);
                            const vcodec = typeof info.video == `boolean` ? info.video : (foundCodec && !`${foundCodec}`.includes(`jpeg`) && !`${foundCodec}`.includes(`png`))

                            //console.log(`--------------\nfoundCodec: ${foundCodec}\nvcodec: ${vcodec}\ninfo.video: ${info.video}\n--------------`)

                            if(addMetadata.thumbnail && !vcodec) {
                                if(!(info.media_metadata.url.thumbnail_url || info.thumbnails) && info.fullInfo) {
                                    skipped.thumbnail = `No thumbnail found`;
                                } else if(info.thumbnails || info.media_metadata.url.thumbnail_url) await new Promise(async r => {
                                    try {
                                        let progressNum = 15;
        
                                        await pfs.renameSync(target, target + `.ezytdl`);
    
                                        let thumbnailAttempts = 0;
                                        let successfulThumbnail = null;
                                        
                                        const continueWithThumbnail = async () => {
                                            if(await pfs.existsSync(`${target + `.png`}`)) {
                                                progressNum = 65;
                                                setProgress(`thumbnail`, {progressNum, status: `Applying thumbnail...`})
                                                //update({status: `Applying thumbnail...`})
    
                                                const args = [`-y`, `-i`, target + `.ezytdl`, `-i`, `${target + `.png`}`, `-c`, `copy`, `-map`, `0:0`, `-map`, `1:0`, `-metadata:s:v`, `title=Album cover`, `-metadata:s:v`, `comment=Cover (front)`];
                        
                                                if(target.endsWith(`.mp3`)) args.splice(args.indexOf(`1:0`)+1, 0, `-id3v2_version`, `3`, `-write_id3v1`, `1`);
            
                                                ////console.log(args);
                        
                                                const proc = child_process.execFile(module.exports.ffmpegPath, [...args, target]);
                        
                                                //proc.stdout.on(`data`, d => {
                                                //    console.log(d.toString().trim())
                                                //});
                                                
                                                proc.stderr.on(`data`, d => {
                                                    //console.error(d.toString().trim())
                                                    progressNum += 1;
                                                    if(progressNum > 90) progressNum = 90;
                                                    setProgress(`thumbnail`, {progressNum})
                                                });
                        
                                                proc.on(`error`, e => {
                                                    console.error(e)
                    
                                                    skipped.thumbnail = `Failed to add cover: ${e}`;
                    
                                                    cleanup(true).then(r);
                                                });
                        
                                                proc.on(`close`, async code => {
                                                    console.log(`song cover added! (code ${code})`);
                                                    
                                                    await cleanup(code === 0 ? false : true);
    
                                                    switch(thumbnailAttempts) {
                                                        case 0:
                                                            thumbnailAttempts = `wait how did it register as 0 tries what`
                                                            break;
                                                        case 1:
                                                            thumbnailAttempts = `ez first try`
                                                            break;
                                                        case 2:
                                                            thumbnailAttempts = `ez second try`
                                                            break;
                                                        case 3:
                                                            thumbnailAttempts = `only 3 attempts maybe possibly (thats kinda high uhh hh)`
                                                            break;
                                                        default:
                                                            thumbnailAttempts = `${thumbnailAttempts} attempt${thumbnailAttempts == 1 ? `` : `s`}${thumbnailAttempts > 10 ? `. what.` : ``}`
                                                            break;
                                                    }
    
                                                    setProgress(`thumbnail`, {progressNum: 100, status: `Thumbnail added! (${thumbnailAttempts})`});
                                                    //update({status: `Thumbnail added! (${thumbnailAttempts})`})
                                                    r();
                                                })
                                            } else {
                                                console.log(`failed to convert image to png!`)
                                                skipped.thumbnail = `Failed to convert thumbnail to PNG`;
                                                cleanup(true).then(r)
                                            }
                                        }
    
                                        const thumbnails = (info.thumbnails || []).reverse();
    
                                        if(info.media_metadata.url.thumbnail_url) thumbnails.unshift({ url: info.media_metadata.url.thumbnail_url, preference: 0, id: `metadata` });
    
                                        for(const thumbnail of thumbnails) {
                                            const code = await new Promise(async res => {
                                                thumbnailAttempts++;
    
                                                let extension = thumbnail.id ? ` "${thumbnail.id}"` : ``;
                                                if(thumbnail.preference) extension += ` (priority ${thumbnail.preference})`;
    
                                                progressNum = 15;
                                                setProgress(`thumbnail`, {progressNum, status: `Downloading thumbnail` + extension + `...`});
                                                //update({status: `Downloading thumbnail` + extension + `...`})
    
                                                const req = require(`superagent`).get(thumbnail.url);
                    
                                                req.pipe(await pfs.createWriteStream(target + `.songcover`));
            
                                                req.on(`data`, () => {
                                                    progressNum += 1;
                                                    if(progressNum > 30) progressNum = 30;
                                                    setProgress(`thumbnail`, {progressNum})
                                                })
                    
                                                req.once(`error`, e => {
                                                    //console.log(e)
                                                    res(1)
                                                });
                    
                                                req.once(`end`, () => {
                                                    progressNum = 35;
                                                    setProgress(`thumbnail`, {progressNum, status: `Converting thumbnail` + extension + `...`})
                                                    //update({status: `Converting thumbnail` + extension + `...`})
                
                                                    const imgConvertProc = child_process.execFile(module.exports.ffmpegPath, [`-y`, `-i`, target + `.songcover`, `-update`, `1`, `-vf`, `crop=min(in_w\\,in_h):min(in_w\\,in_h)`, target + `.png`]);
                
                                                    imgConvertProc.stdout.on(`data`, d => {
                                                        //console.log(d.toString().trim())
                                                        progressNum += 1;
                                                        if(progressNum > 60) progressNum = 60;
                                                        setProgress(`thumbnail`, {progressNum})
                                                    })
                
                                                    //imgConvertProc.stderr.on(`data`, d => {
                                                    //    console.error(d.toString().trim())
                                                    //})
                
                                                    imgConvertProc.once(`close`, c => {
                                                        successfulThumbnail = c == 0 ? thumbnail : successfulThumbnail;
                                                        res(c)
                                                    });
    
                                                    imgConvertProc.once(`error`, e => res(1));
                                                })
                                            });
    
                                            if(code == 0) break;
                                        };
    
                                        continueWithThumbnail();
                                    } catch(e) {
                                        console.error(e)
            
                                        skipped.thumbnail = `${e}`;
            
                                        cleanup(true).then(r);
                                    }
                                });
                            } else if(vcodec) {
                                skipped.thumbnail = `Video detected`;
                            }
                        }
                    } else {
                        console.log(`no metadata to add! (run: ${run}) (ffmpeg installed: ${module.exports.ffmpegPath ? true : false}) (file: ${file ? true : false})`);
                        if(!run && addMetadata) {
                            Object.entries(addMetadata).filter(v => v[1] && !v[0].startsWith(`opt-`)).forEach(k => skipped[k[0]] = `Download was canceled.`);
                        } else if(!module.exports.ffmpegPath) {
                            Object.entries(addMetadata).filter(v => v[1] && !v[0].startsWith(`opt-`)).forEach(k => skipped[k[0]] = `FFmpeg wasn't found.`);
                        } else if(!file || !await pfs.existsSync(target)) {
                            Object.entries(addMetadata).filter(v => v[1] && !v[0].startsWith(`opt-`)).forEach(k => skipped[k[0]] = `File wasn't found.`);
                        }
                    }
    
                    r();
                }).then(() => {
                    //if(Object.keys(skipped).length == Object.keys(addMetadata || {}).filter(v => v).length) deleteProgress(`metadata`);
                    const status = resolveStatus + (Object.keys(skipped).length > 0 ? `<br><br>${Object.entries(skipped).map(s => `- Skipped ${s[0]} embed: ${s[1]}`).join(`<br>`)}` : ``);
                    //console.log(`-------------\n${status}\n-------------`)
                    resolve(update({ status, percentNum: 100 }))
                })
            };

            let modifiedResolution = false;

            const runThroughFFmpeg = async (code, replaceInputArgs, replaceOutputArgs, useFile=null) => {
                const temporaryFiles = useFile ? [] : (await pfs.readdirSync(saveTo)).filter(f => f.startsWith(temporaryFilename) && !f.endsWith(`.part`) && !f.endsWith(`.meta`));

                if(!useFile) filenames.push(...temporaryFiles);

                let previousFilename = obj.destinationFile ? `ezytdl` + obj.destinationFile.split(`ezytdl`).slice(-1)[0] : temporaryFilename + `.${ytdlpSaveExt}`;

                const fallback = async (msg, deleteFile) => {
                    try {
                        console.log(`ffmpeg did not save file, renaming temporary file`);
                        if(deleteFile) {
                            for(const file of temporaryFiles) {
                                if(await pfs.existsSync(require(`path`).join(saveTo, file))) await pfs.unlinkSync(require(`path`).join(saveTo, file));
                            }
                        } else {
                            for(const file of temporaryFiles) {
                                if(await pfs.existsSync(require(`path`).join(saveTo, file))) await pfs.renameSync(require(`path`).join(saveTo, file), require(`path`).join(saveTo, file.includes(temporaryFilename) ? file.replace(temporaryFilename, ytdlpFilename) : (ytdlpFilename + `.${file.split(`.`).slice(-1)[0]}`)));
                            }
                        }
                    } catch(e) { console.log(e) }
                    if(msg && typeof msg == `string`) {
                        update({failed: true, percentNum: 100, status: msg, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.` + previousFilename.split(`.`).slice(-1)[0], url, format})
                    } else update({failed: true, percentNum: 100, status: `Could not convert to ${`${convert ? convert.ext : `--`}`.toUpperCase()}.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.` + previousFilename.split(`.`).slice(-1)[0], url, format});
                    return res()
                    //purgeLeftoverFiles(saveTo)
                };

                console.log(`temporary (target) files`, useFile)

                if(temporaryFiles.length == 0 && !useFile) return fallback(`No files were found, aborting conversion.`, false);
    
                if(killAttempt > 0) return fallback(`Download canceled.`, true);

                filenames.push(ytdlpFilename)

                if(useFile) onlyGPUConversion = false;
    
                //if(!useFile && !fs.existsSync(previousFilename)) previousFilename = await module.exports.getFilename(url, info, thisFormat, temporaryFilename + `.%(ext)s`, true);
    
                //if(!useFile) filenames.push(previousFilename)

                if(convert) {
                    for(const key of Object.keys(convert)) {
                        if(typeof convert[key] != `boolean` && !convert[key]) delete convert[key] // remove any falsy values
                    }

                    const rawExt = convert.ext || info.ext || ytdlpSaveExt || (thisFormat || {}).ext;

                    if(!rawExt) return fallback(`Could not convert to ${`${convert ? convert.ext : `--`}`.toUpperCase()} -- unable to find extension. This shouldn't have happened.`, true)

                    ext = `.${rawExt}`

                    const destinationCodec = await module.exports.getMuxer(ext.slice(1));

                    //if(!destinationCodec.compatible) return fallback(`Could not convert to ${ext.toUpperCase()} -- unable to find muxer details.`, true);

                    const inputArgs = replaceInputArgs || [];

                    let totalDuration = [0, info.duration ? info.duration.units.ms : (info.originalDuration ? info.originalDuration*1000 : 0)];

                    let seek = [];

                    let totalTrimmedDuration = 0;

                    if(info.duration && info.duration.units && info.duration.units.ms) {
                        if(convert.trimFrom) {
                            inputArgs.push(`-ss`, convert.trimFrom);
                            const ms = time(convert.trimFrom).units.ms;
                            seek.push(Math.ceil(ms/1000));
                            totalDuration[0] = ms;
                        } else seek.push(0);
    
                        if(convert.trimTo) {
                            inputArgs.push(`-to`, convert.trimTo);
                            const ms = time(convert.trimTo).units.ms;
                            seek.push(Math.ceil(ms/1000))
                            totalDuration[1] = ms;
                        } else seek.push(Math.ceil(info.duration.units.ms/1000));
    
                        totalTrimmedDuration = Math.max(0, (totalDuration[1] ? totalDuration[1] - totalDuration[0] : null));
    
                        if(seek[0] != 0 || seek[1] != Math.ceil(info.duration.units.ms/1000)) {
                            ytdlpFilename = ytdlpFilename.trim() + `.trimmed (${seek[0]}-${seek[1]})`;
                        }
                    }

                    if(useFile) {
                        inputArgs.push(`-i`, useFile);
                    } else for(const file of temporaryFiles) {
                        if(await pfs.existsSync(require(`path`).join(saveTo, file))) {
                            inputArgs.push(`-i`, require(`path`).join(saveTo, file));
                        }
                    }

                    console.log(inputArgs)

                    console.log(`convert`, convert)

                    if(typeof convert.additionalInputArgs == `string`) {
                        const yargsResult = yargs(convert.additionalInputArgs.replace(/-(\w+)/g, '--$1')).argv
                
                        const parsed = Object.entries(yargsResult);

                        convert.additionalInputArgs = [];
                
                        parsed.filter(o => o[1]).forEach((o, i) => {
                            if(o[0] != `$0` && o[0] != `_` && o[0].toLowerCase() == o[0]) {
                                const str = [`-${o[0]}`, `${o[1]}`];
                                //console.log(str, o[0], o[1])
                                convert.additionalInputArgs.push(...str)
                            }
                        });
                    }

                    if(convert.additionalInputArgs) inputArgs.unshift(...convert.additionalInputArgs);

                    const outputArgs = [...(replaceOutputArgs || []), require(`path`).join(saveTo, ytdlpFilename) + ext];

                    if(convert.audioBitrate) outputArgs.unshift(`-b:a`, convert.audioBitrate);
                    if(convert.audioSampleRate) outputArgs.unshift(`-ar`, convert.audioSampleRate);
                    if(convert.videoBitrate) outputArgs.unshift(`-b:v`, convert.videoBitrate);
                    if(convert.videoFPS) outputArgs.unshift(`-r`, convert.videoFPS);

                    const numRegex = /-?\d+(\.\d+)?/g;

                    if(convert.videoResolution && numRegex.test(convert.videoResolution)) {
                        convert.videoResolution = convert.videoResolution.replace(/x/g, `:`).trim();

                        console.log(`raw; videoResolution: ${convert.videoResolution}`)

                        var width, height;

                        for(const file of (useFile ? [useFile] : temporaryFiles.map(f => require(`path`).join(saveTo, f)))) {
                            if(!width || !height) var { width, height } = await module.exports.getResolution(file);
                        };

                        if(width && height) {
                            const split = convert.videoResolution.split(`:`).filter(s => s.match(numRegex));

                            console.log(`unparsed; split: [ ${split.join(`, `)} ]`)

                            if(split.length == 1) split.unshift(`-1`);

                            let newWidth = Number(split[0].match(numRegex)[0]);
                            let newHeight = Number(split[1].match(numRegex)[0]);

                            console.log(`before; newWidth: ${newWidth}; newHeight: ${newHeight}`)

                            if(newWidth == -1 && newHeight > -1) {
                                newWidth = Math.round((newHeight / height) * width);
                            } else if(newHeight == -1 && newWidth > -1) {
                                newHeight = Math.round((newWidth / width) * height);
                            }

                            console.log(`after; newWidth: ${newWidth}; newHeight: ${newHeight}`)

                            if(newWidth > -1 || newHeight > -1) {
                                const newScaledWidth = newWidth > -1 ? newWidth : Math.round((newHeight / height) * width);
                                const newScaledHeight = newHeight > -1 ? newHeight : Math.round((newWidth / width) * height);
                                
                                const newScale = newScaledWidth > newScaledHeight ? `${newScaledWidth}:-1` : `-1:${newScaledHeight}`;

                                const newCrop = `${newWidth}:${newHeight}`;
        
                                //outputArgs.unshift(`-vf`, `scale=${Number(convert.videoResolution) ? `${convert.videoResolution}:-1` : convert.videoResolution.trim().replace(/x/g, `:`)}`);
                                outputArgs.unshift(`-vf`, `scale=${newScale},crop=${newCrop}`);
    
                                //convert.videoResolution = `${newWidth}x${newHeight}`;
                            } else {
                                console.log(`(invalid videoResolution) new width: ${newWidth}; new height: ${newHeight}`)
                            }
                        } else {
                            console.log(`(invalid videoResolution) current width: ${width}; current height: ${height}`)
                        }
                    } else if(convert.videoResolution) {
                        console.log(`(invalid videoResolution) provided: ${convert.videoResolution}; test: ${numRegex.test(convert.videoResolution)}`)
                    }

                    if(typeof convert.additionalOutputArgs == `string`) {
                        const yargsResult = yargs(convert.additionalOutputArgs.replace(/-(\w+)/g, '--$1')).argv
                
                        const parsed = Object.entries(yargsResult);

                        convert.additionalOutputArgs = [];
                
                        parsed.filter(o => o[1]).forEach((o, i) => {
                            if(o[0] != `$0` && o[0] != `_` && o[0].toLowerCase() == o[0]) {
                                const str = [`-${o[0]}`, `${o[1]}`];
                                //console.log(str, o[0], o[1])
                                convert.additionalOutputArgs.push(...str)
                            }
                        });
                    }

                    if(convert.additionalOutputArgs) outputArgs.unshift(...convert.additionalOutputArgs);

                    console.log(`ffmpeg arguments`, inputArgs, outputArgs)
    
                    const spawnFFmpeg = (rawArgs2, name) => new Promise(async (resolveFFmpeg, rej) => {
                        let args2 = rawArgs2.slice(0);

                        if(killAttempt > 0) {
                            update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                            return res()
                            //purgeLeftoverFiles(saveTo)
                            //return res(`Download canceled.`, true);
                        }

                        let status = `Converting to ${(destinationCodec ? destinationCodec.name : null) || `${ext}`.toUpperCase()} using ${name}...`;

                        const additionalArgsFromConvert = [...(convert.additionalInputArgs || []), ...(convert.additionalOutputArgs || [])];

                        const additionalOpts = additionalArgsFromConvert.filter(s => s.startsWith(`-`)).map(s => s.slice(1));

                        if(advanced) {
                            status += (additionalArgsFromConvert.length > 0 ? `<br>(using extra processing: ${additionalOpts.join(`, `)})` : ``) + `<br><br>- ${Object.keys(convert).filter(s => convert[s]).map(s => `${s}: ${convert[s] || `(no conversion)`}`).join(`<br>- `)}`
                        }
    
                        update({status, percentNum: -1, eta: `--`});

                        console.log(args2)
    
                        proc = child_process.execFile(module.exports.ffmpegPath, [`-y`, ...args2]);
                        
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

                            console.log(data)

                            allLogs += data.trim() + `\n`;

                            if(data.includes(`Duration:`)) {
                                duration = time(data.trim().split(`Duration:`)[1].trim().split(`,`)[0]).units.ms;
                                //console.log(`duration: `, duration)
                            };

                            if(data.trim().startsWith(`ERROR: `)) {
                                sendNotification({
                                    type: `error`,
                                    headingText: `yt-dlp failed to download ${url} [2]`,
                                    bodyText: `${data.trim().split(`ERROR: `)[1]}`
                                })
                            };

                            const sendObj = {}
        
                            if(data.includes(`time=`)) {
                                const timestamp = time(data.trim().split(`time=`)[1].trim().split(` `)[0]).units.ms;
                                Object.assign(sendObj, {percentNum: (Math.round((timestamp / (totalTrimmedDuration || duration)) * 1000))/10})
                            } else sendObj.percentNum = -1;
    
                            let speed = [];
    
                            if(data.includes(`fps=`)) speed.push(data.trim().split(`fps=`)[1].trim().split(` `)[0] + `fps`);
        
                            if(data.includes(`speed=`)) speed.push(data.trim().split(`speed=`)[1].trim().split(` `)[0]);
                            
                            if(speed && speed.length > 0) Object.assign(sendObj, {downloadSpeed: speed.join(` | `)});

                            if(Object.keys(sendObj).length > 0) update(sendObj)
                        });
        
                        proc.stdout.on(`data`, data => {
                            console.log(`STDOUT | ${data.toString().trim()}`)
                            allLogs += data.toString().trim() + `\n`;
                        });
        
                        proc.on(`close`, async (code) => {
                            if(killAttempt > 0) {
                                update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                                return res()
                                //return purgeLeftoverFiles(saveTo)
                                //return res(`Download canceled.`, true);
                            } else if(code == 0) {
                                console.log(`ffmpeg completed; deleting temporary file...`);
                                //if(fs.existsSync(saveTo + previousFilename)) fs.unlinkSync(saveTo + previousFilename);
                                for(const f of temporaryFiles) {
                                    if(await pfs.existsSync(require(`path`).join(saveTo, f))) await pfs.unlinkSync(require(`path`).join(saveTo, f));
                                }
                                update({percentNum: 100, status: `Done!`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format});
                                resolveFFmpeg()
                            } else {
                                if(allLogs.includes(`Press [q] to stop, [?] for help`)) {
                                    rej(allLogs.split(`Press [q] to stop, [?] for help`)[1].trim())
                                } else rej(code)
                            }
                        })
                    });

                    const ffmpegGPUArgs = await require(`./configs`).ffmpegGPUArgs();
    
                    const transcoders = {};

                    const transcodersArr = Object.entries(hardwareAcceleratedConversion).filter(v => v[1]).map(v => Object.assign({}, ffmpegGPUArgs[v[0]], { key: v[0] }));

                    for(const transcoder of transcodersArr) transcoders[transcoder.key] = transcoder;

                    transcoders.use = transcodersArr[0];

                    console.log(`transcoders: `, transcoders)
                    
                    obj.destinationFile = ytdlpFilename;

                    let originalVideoCodec = null;
                    let originalAudioCodec = null;

                    let originalExtensions = [];

                    let codecPromises = [];

                    if(convert.videoCodec || destinationCodec.videoCodec) {
                        if(useFile) {
                            const fileExt = useFile.split(`.`).slice(0, -1)[0];

                            console.log(`adding ext ${fileExt}`)

                            originalExtensions.push(fileExt);

                            codecPromises.push(new Promise(async r => {
                                originalVideoCodec = await module.exports.getCodec(useFile);
                                r();
                            }));
                            
                            codecPromises.push(new Promise(async r => {
                                originalAudioCodec = await module.exports.getCodec(useFile, true);
                                r();
                            }));
                        } else for(const f of temporaryFiles) {
                            if(await pfs.existsSync(require(`path`).join(saveTo, f))) {
                                const fileExt = f.split(`.`).slice(0, -1)[0];

                                console.log(`adding ext ${fileExt}`)

                                if(!originalExtensions.includes(fileExt)) originalExtensions.push(fileExt);

                                if(!originalVideoCodec) codecPromises.push(new Promise(async r => {
                                    originalVideoCodec = await module.exports.getCodec(require(`path`).join(saveTo, f));
                                    r();
                                }));
    
                                if(!originalAudioCodec) codecPromises.push(new Promise(async r => {
                                    originalAudioCodec = await module.exports.getCodec(require(`path`).join(saveTo, f), true);
                                    r();
                                }));
                            };
                        }
                    } else if(useFile) {
                        const fileExt = useFile.split(`.`).slice(-1)[0];

                        console.log(`adding ext ${fileExt}`)

                        originalExtensions.push(fileExt);
                    } else for(const f of temporaryFiles) {
                        if(await pfs.existsSync(require(`path`).join(saveTo, f))) {
                            const fileExt = f.split(`.`).slice(-1)[0];

                            console.log(`adding ext ${fileExt}`)

                            if(!originalExtensions.includes(fileExt)) originalExtensions.push(fileExt);
                        };
                    }

                    if(codecPromises.length > 0) await Promise.all(codecPromises);

                    if(!originalVideoCodec) convert.forceSoftware = true;

                    console.log(`originalExtensions`, originalExtensions)

                    const originalExtension = originalExtensions.join(` / `)
    
                    console.log(`original obj: `, transcoders.use, `originalVideoCodec: `, originalVideoCodec, `originalAudioCodec:`, originalAudioCodec, `muxer: `, destinationCodec);

                    const originalCodec = originalVideoCodec || originalAudioCodec;
                    const targetCodec = convert.videoCodec || destinationCodec.codec;

                    if(convert.videoCodec && !ffmpegVideoCodecs.includes(convert.videoCodec)) {
                        return fallback(`Could not convert the video stream to ${convert.videoCodec.toString().toUpperCase()} -- target codec not supported by installed build of FFmpeg.`, true);
                    } else if(convert.audioCodec && !ffmpegAudioCodecs.includes(convert.audioCodec)) {
                        return fallback(`Could not convert the audio stream to ${convert.audioCodec.toString().toUpperCase()} -- target codec not supported by installed build of FFmpeg.`, true);
                    }
    
                    let compatibleDecoders = module.exports.getHardwareTranscoders(false, transcoders, originalVideoCodec);
    
                    let compatibleEncoders = module.exports.getHardwareTranscoders(true, transcoders, targetCodec);

                    console.log(`compatible decoders for ${originalVideoCodec}: `, compatibleDecoders, `compatible encoders for ${targetCodec}: `, compatibleEncoders)

                    let attemptArgs = [];

                    if(!convert.forceSoftware && compatibleDecoders.length > 0 && compatibleEncoders.length > 0) {
                        for(const decoder of compatibleDecoders) {
                            for(const encoder of compatibleEncoders) {
                                const o = {
                                    string: `${originalCodec || originalExtension.toUpperCase()}_${decoder.string} -> ${targetCodec || ext.slice(1).toUpperCase()}_${encoder.string}`,
                                    hardware: `Full`,
                                    decoder: decoder.name,
                                    encoder: encoder.name,
                                    args: [...decoder.pre, ...inputArgs, ...encoder.post, ...outputArgs]
                                };

                                if(!attemptArgs.find(a => a.decoder == o.decoder && a.encoder == o.encoder)) attemptArgs.push(o);
                            }
                        }
                    };

                    if(!convert.forceSoftware && compatibleDecoders.length > 0) {
                        for(const decoder of compatibleDecoders) {
                            const o = {
                                string: `${originalCodec || originalExtension.toUpperCase()}_${decoder.string} -> ${targetCodec || ext.slice(1).toUpperCase()} (CPU)`,
                                hardware: `Partial`,
                                decoder: decoder.name,
                                encoder: `Software`,
                                args: [...decoder.pre, ...inputArgs, ...(convert.videoCodec ? [`-c:v`, `${convert.videoCodec}`] : []), ...outputArgs]
                            };

                            if(!attemptArgs.find(a => a.decoder == o.decoder && a.encoder == o.encoder)) attemptArgs.push(o);
                        }
                    };

                    if(!convert.forceSoftware && compatibleEncoders.length > 0) {
                        for(const encoder of compatibleEncoders) {
                            const o = {
                                string: `${originalCodec || originalExtension.toUpperCase()} (CPU) -> ${targetCodec || ext.slice(1).toUpperCase()}_${encoder.string}`,
                                hardware: `Partial`,
                                decoder: `Software`,
                                encoder: encoder.name,
                                args: [...inputArgs, ...encoder.post, ...outputArgs]
                            };

                            if(!attemptArgs.find(a => a.decoder == o.decoder && a.encoder == o.encoder)) attemptArgs.push(o);
                        }
                    };
                    
                    if(!onlyGPUConversion || convert.forceSoftware) {
                        attemptArgs.push({
                            string: `${originalCodec || originalExtension.toUpperCase()} (CPU) -> ${targetCodec || ext.slice(1).toUpperCase()} (CPU)`,
                            hardware: `None`,
                            decoder: `Software`,
                            encoder: `Software`,
                            args: [...inputArgs, ...(convert.videoCodec ? [`-c:v`, `${convert.videoCodec}`] : []), ...outputArgs]
                        });
                    }

                    console.log(attemptArgs);

                    for(const i in attemptArgs) {
                        const { string, hardware, args } = attemptArgs[i];

                        try {
                            console.log(`Attempting conversion using ${hardware} hardware acceleration: ${string}`)
                            const conversionProc = await spawnFFmpeg(args, `(${Number(i)+1}/${attemptArgs.length}) ${string}`);
                            return res(conversionProc);
                        } catch(e) {
                            console.log(`FFmpeg failed converting -- ${e}; trying again...`)
                        }
                    };

                    let quickResolve = `<br><br>Are your conversion settings up to date? Visit settings and click the "Auto Detect" button under "${require(`../configStrings.json`).hardwareAcceleratedConversion}"`;

                    if(onlyGPUConversion) quickResolve += `<br><br>Or you can try again with "${require(`../configStrings.json`).onlyGPUConversion}" disabled in settings.`;

                    if(transcodersArr.length == 0 && !convert.forceSoftware) {
                        return fallback(`Conversion failed: "${require(`../configStrings.json`).onlyGPUConversion}" is set to true, but all GPU transcoders are disabled in the settings.` + quickResolve)
                    } else {
                        let msg = null;

                        if(originalVideoCodec) msg = `The video codec (${originalVideoCodec}) provided by the downloaded format is not compatible with FFmpeg's GPU transcoding.`
                        else msg = `Unable to convert using any of the hardware-acceleration methods enabled in settings.`

                        return fallback(msg + quickResolve);
                    }
                } else if(!convert) {
                    for(const file of temporaryFiles) {
                        if(await pfs.existsSync(require(`path`).join(saveTo, file))) await pfs.renameSync(require(`path`).join(saveTo, file), require(`path`).join(saveTo, file.includes(temporaryFilename) ? file.replace(temporaryFilename, ytdlpFilename) : (ytdlpFilename + `.${file.split(`.`).slice(-1)[0]}`)));
                    }

                    if(killAttempt > 0) {
                        update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                        return res()
                        //purgeLeftoverFiles(saveTo)
                    } else if(args.includes(`-S`) && ytdlpSaveExt == ext) {
                        update({code, saveLocation: saveTo, url, format, status: `Downloaded best quality provided for ${ext} format (no conversion done${reasonConversionNotDone ? ` -- ${reasonConversionNotDone}` : ``})`});
                    } else if(args.includes(`-S`) && ytdlpSaveExt != ext) {
                        update({code, saveLocation: saveTo, url, format, status: `${ext} was not provided by this website (downloaded ${ytdlpSaveExt} instead${reasonConversionNotDone ? ` -- ${reasonConversionNotDone}` : ``})`});
                    } else if(reasonConversionNotDone) {
                        update({code, saveLocation: saveTo, url, format, status: `Could not convert: ${reasonConversionNotDone}`});
                    } else update({code, saveLocation: saveTo, url, format, status: `Done!`});
                    res()
                } else {
                    if(killAttempt > 0) {
                        update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                        return res()
                        //purgeLeftoverFiles(saveTo)
                    } else {
                        update({code, saveLocation: saveTo, url, format, status: `Done!`})
                        res()
                    }
                }
            };

            //console.log(`--- DOWNLOADING FORMAT (${format}) ---\n`, thisFormat)

            if(info._platform != `file`) {
                args = [`-f`, format, url, `-o`, require(`path`).join(saveTo, temporaryFilename) + `.%(ext)s`, `--no-mtime`, ...additionalArgs];

                if(!format) args.splice(0, 2)
    
                args.push(`--ffmpeg-location`, ``);
        
                if(!(await pfs.existsSync(module.exports.ffmpegPath))) {
                    if(convert && convert.ext) {
                        ext = convert.ext
                        convert = false;
                        reasonConversionNotDone = `ffmpeg not installed`
                    };
                };
                
                if(!convert && ext) {
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
                
                if(!module.exports.ffmpegPath && addMetadata && addMetadata.tags) args.push(`--add-metadata`, `--no-write-playlist-metafiles`);
                if(!module.exports.ffmpegPath && addMetadata && addMetadata.thumbnail) args.push(`--embed-thumbnail`, `--no-write-thumbnail`);
                
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

                proc.once('info', newInfo => {
                    console.log(`INFODUMP RECEIVED`);
                    Object.assign(info, module.exports.parseInfo(newInfo, true), info._off_platform ? { media_metadata: info.media_metadata } : {});
                })
        
                proc.stderr.on(`data`, data => {
                    const string = data.toString();
    
                    if(string.trim().startsWith(`ERROR: `)) {
                        if(string.toLowerCase().includes(`ffmpeg not found`) && string.toLowerCase().includes(`postprocessing`)) {
                            //console.log(`not doing anything with this error`, string.trim())
                        } else if(string.toLowerCase().includes(`ffmpeg could not be found`)) {
                            fallbackToFFmpeg = true;
                        } else sendNotification({
                            type: `error`,
                            headingText: `yt-dlp failed to download ${url} [1]`,
                            bodyText: `${string.trim().split(`ERROR: `)[1]}`,
                            stack: proc.lastTrace
                        })
                    }
    
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

                    if(fallbackToFFmpeg && module.exports.ffmpegPath) {
                        if(!convert) {
                            // download with FFmpeg instead of yt-dlp
            
                            args = [...(disableHWAcceleratedConversion ? [] : [`-hwaccel`, `auto`]), `-i`, thisFormat.url || url, `-movflags`, `+faststart`, `-c`, `copy`, `-y`, require(`path`).join(saveTo, temporaryFilename) + `.${ytdlpSaveExt}`];
            
                            if(info.http_headers) {
                                //console.log(`using http headers:`, info.http_headers);
            
                                args.unshift(`-headers`, Object.keys(info.http_headers).map(s => `${s}: ${info.http_headers[s]}`).join(`\r\n`))
                            }
            
                            //console.log(`saveTo: ` + saveTo, `\n- ` + args.join(`\n- `))
            
                            proc = child_process.execFile(module.exports.ffmpegPath, args);
                    
                            update({saveLocation: saveTo, url, format, kill: () => {
                                console.log(`killing ffmpeg stream...`)
                                killAttempt++
                                proc.stdin.write(`q`)
                                //proc.kill(`SIGINT`);
                            }, status: `Streaming (with FFmpeg)...`})
            
                            let savedTime = `00:00`
            
                            const log = (data) => {
                                const string = data.toString().trim();
            
                                //console.log(string)
                                
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
            
                                proc = child_process.execFile(module.exports.ffmpegPath, [`-i`, require(`path`).join(saveTo, temporaryFilename + `.${ytdlpSaveExt}`), `-c`, `copy`, `-y`, require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`]);
            
                                update({status: `Remuxing to ${`${ytdlpSaveExt}`.toUpperCase()}`, kill: () => {
                                    killAttempt++
                                    //proc.stdin.write(`q`)
                                    proc.kill(`SIGINT`);
            
                                    // dont auto kill this process, because if the user canceled the last one, chances are it was a 24/7 livestream.
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
                                        if(await pfs.existsSync(require(`path`).join(saveTo, temporaryFilename + `.${ytdlpSaveExt}`))) await pfs.unlinkSync(require(`path`).join(saveTo, temporaryFilename + `.${ytdlpSaveExt}`));
                                        update({code, saveLocation: saveTo, url, format, status: `Done!`})
                                        res()
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
            } else {
                if(!(await pfs.existsSync(module.exports.ffmpegPath))) return resolve(update({ failed: true, status: `FFmpeg was not found on your system -- conversion aborted.` }));
                if(!(await pfs.existsSync(url))) return resolve(update({ failed: true, status: `File not found -- conversion aborted.` }));

                const inputArgs = [];
                const outputArgs = [];

                //console.log(info, format, convert)

                if(info.format_note && typeof info.format_index == `number`) outputArgs.push(`-map`, `0:${info.format_index}`)

                console.log(`running raw conversion -- inputArgs`, inputArgs, `outputArgs`, outputArgs)

                runThroughFFmpeg(0, inputArgs, outputArgs, url);
            }
        } catch(e) {
            console.error(e);
            sendNotification({
                type: `error`,
                headingText: `Error downloading media (${format} / ${info && info.title ? info.title : `unknown`})`,
                bodyText: `An error occured while trying to download the media.\n\nError: ${e.toString()}`
            });
            resolve(update({ failed: true, status: `${e.toString()}` }))
        }
    }),
    findEquivalent: (info, ignoreStderr) => new Promise(async res => {
        const instanceName = `findEquivalent-${info.extractor}-${info.id}-${idGen(16)}`;

        const manager = downloadManager.get(instanceName, {staggered: true, noSendErrors: true});

        manager.set({ concurrentDownloadsMult: 2 })

        manager.queueAction(manager.queue.queue.map(o => o.id), `remove`);
        manager.queueAction(manager.queue.complete.map(o => o.id), `remove`);
        manager.queueAction(manager.queue.paused.map(o => o.id), `remove`);

        manager.queueEventEmitter.removeAllListeners(`queueUpdate`);

        if(downloadManager[instanceName].timeout) clearTimeout(downloadManager[instanceName].timeout);

        let badEntries = 0;

        manager.queueEventEmitter.on(`queueUpdate`, (queue) => {
            const totalLength = Object.values(queue).reduce((a, b) => a + b.length, 0);

            if(queue.complete.length == totalLength) {
                console.log(`queue complete!`);

                res(module.exports.parseInfo(info, true));

                downloadManager[instanceName].timeout = setTimeout(() => {
                    if(downloadManager[instanceName]) {
                        console.log(`deleting instance ${instanceName}`)
                        delete downloadManager[instanceName];
                    }
                }, 15000)
            }
        });

        const match = (thisInfo, resultsInfo) => {
            const originalTitle = thisInfo.media_metadata.general.title;
            const originalArtist = thisInfo.media_metadata.general.artist;

            resultsInfo.entries = resultsInfo.entries.map(result => {
                const { title, artist } = result.media_metadata.general;

                result.similarities = {};

                if(originalTitle && title && originalArtist && artist) {
                    Object.assign(result.similarities, {
                        lowercaseTitleAndArtist: ((compareTwoStrings(originalTitle.toLowerCase(), title.toLowerCase()) * .25) + (compareTwoStrings(originalArtist.toLowerCase(), artist.toLowerCase()) * .175)),
                        uppercaseTitleAndArtist: ((compareTwoStrings(originalTitle, title) * .35) + (compareTwoStrings(originalArtist, artist) * .25))
                    });
                };
                
                if(title && originalTitle) {
                    Object.assign(result.similarities, {
                        lowercaseTitle: ((compareTwoStrings(originalTitle.toLowerCase(), title.toLowerCase()) * .3)),
                        uppercaseTitle: ((compareTwoStrings(originalTitle, title) * .5))
                    });

                    if(title.split(`(`).length > originalTitle.split(`(`).length) Object.assign(result.similarities, {
                        lowercaseTitleWithTrimmedParentheses: (compareTwoStrings(originalTitle.toLowerCase(), title.toLowerCase().split(`(`).slice(0, originalTitle.split(`(`).length).join(`(`)) * .3),
                        uppercaseTitleWithTrimmedParentheses: (compareTwoStrings(originalTitle, title.split(`(`).slice(0, originalTitle.split(`(`).length).join(`(`)) * .5)
                    });

                    if(originalArtist) {
                        Object.assign(result.similarities, {
                            lowercaseFormattedTitle: (compareTwoStrings(`${originalArtist} - ${originalTitle}`.toLowerCase(), title.toLowerCase()) * .3),
                            uppercaseFormattedTitle: (compareTwoStrings(`${originalArtist} - ${originalTitle}`, title) * .5),
                        });

                        Object.assign(result.similarities, {
                            lowercaseTitleWithArtist: (compareTwoStrings(originalArtist.toLowerCase() + ` - ` + originalTitle.toLowerCase(), title.toLowerCase()) * .3),
                            uppercaseTitleWithArtist: (compareTwoStrings(originalArtist + ` - ` + originalTitle, title) * .5)
                        });
                    }
                };

                if(Object.keys(result.similarities).length > 0) {
                    result.similarity = Math.max(...Object.values(result.similarities), 0)
    
                    const targetDuration = thisInfo.originalDuration;
                    const newDuration = result.originalDuration;

                    if(targetDuration && newDuration) {
                        let top = newDuration;
                        let bottom = targetDuration;

                        let value = top / bottom;
                        
                        if(value > 1) {
                            top = bottom - (top - bottom);
                            value = top / bottom;
                        };

                        if(value < 0) value = 0;

                        Object.assign(result.similarities, {
                            originalDurationValues: [newDuration, targetDuration],
                            durationValues: [top, bottom],
                            durationValue: value,
                            durationAddition: (durationCurve(value)*1.5) - 0.6
                        });

                        result.similarity += result.similarities.durationAddition;

                        return result;
                    } else if(!targetDuration || resultsInfo.entries.filter(o => o.originalDuration).length == 0) { // if no results have a duration, go ahead and return this
                        return result;
                    } else return undefined; // if this result doesn't have a duration, AND other results have durations, don't return it
                } else return undefined;
            }).filter(a => a !== undefined && a.similarity).sort((a, b) => a.similarity < b.similarity ? 1 : -1);
            
            /*resultsInfo.entries.forEach(a => {
                console.log(`- ${a.media_metadata.general.title} - ${a.similarity}`, a.similarities)
            })*/

            Object.assign(thisInfo, {
                url: resultsInfo.entries[0].url,
                formats: resultsInfo.entries[0].formats,
                _needs_original: false,
            });

            return module.exports.parseInfo(thisInfo, true);
        }

        if(info.entries) for(const i in info.entries) {
            const entry = info.entries[i];

            manager.createDownload([{query: `"${e.artist}" - "${e.title}"`, from: `youtube`, count: 15, noVerify: true, ignoreStderr}, false], (e) => {
                if(e) {
                    console.log(`new info!`);
                    match(entry, module.exports.parseInfo(e));
                    entry.searchResults = e;
                    console.log(`added "${entry.title}" (id: ${entry.id} / url: ${entry.url}) to index ${i}`)
                } else badEntries++;
            }, `search`);
        } else {
            manager.createDownload([{query: `"${info.artist}" - "${info.title}"`, from: `youtube`, count: 15, noVerify: true, ignoreStderr}, false], (e) => {
                if(e) {
                    console.log(`new info!`);
                    match(info, module.exports.parseInfo(e));
                    info.searchResults = e;
                    console.log(`added "${info.title}" (id: ${info.id} / url: ${info.url})`)
                } else badEntries++;
            }, `search`);
        }

        manager.queueEventEmitter.emit(`queueUpdate`, manager.queue);
    })
};

const blacklistedAuths = [`download`, `ffprobeInfo`, `ffprobeDir`, `ffprobe`]

for(const entry of Object.entries(module.exports).filter(o => typeof o[1] == `function`)) {
    const name = entry[0];
    const func = entry[1];

    if(!module.exports.ytdlp) module.exports.ytdlp = {};

    module.exports.ytdlp[name] = func;

    module.exports[name] = (...args) => {
        const authType = !blacklistedAuths.find(o => o == name) ? authentication.check(args[0] && typeof args[0] == `object` && typeof args[0].query == `string` ? args[0].query : ``) : null
        if(args[0] && typeof args[0] == `object` && args[0].query && authType) {
            const doFunc = platforms.find(p => p.name == authType)[name];
            console.log(`authenticated request! (type: ${authType}) (function exists? ${doFunc ? true : false})`);
            if(doFunc) {
                console.log(`running function...`)
                return new Promise(async (res, rej) => {
                    updateStatus(`Getting authentication token...`)
                    authentication.getToken(authType).then(token => {
                        if(token) {
                            doFunc(token, ...args).then(o => {
                                const parsed = module.exports.parseInfo(Object.assign(o, {
                                    extractor: authType.toLowerCase() + (o.type ? `:${o.type.toLowerCase()}` : ``),
                                    extractor_key: authType[0].toUpperCase() + authType.slice(1) + (o.type ? o.type[0].toUpperCase() + o.type.slice(1) : ``),
                                    _off_platform: true,
                                    _platform: authType,
                                    _needs_original: true,
                                }));
    
                                if(!parsed.entries) {
                                    module.exports.findEquivalent(parsed, false, false, true).then(equivalent => {
                                        module.exports.verifyPlaylist(Object.assign({}, equivalent, {fullInfo: false}), { forceRun: true }).then(o => res(Object.assign(parsed, {
                                            formats: o.formats,
                                        }))).catch(rej);
                                    }).catch(rej);
                                } else res(parsed)
                            }).catch(rej);
                        } else {
                            console.log(`failed to auth`)
                            return func(...args).then(res).catch(rej);
                        }
                    }).catch(rej)
                })
            } else {
                console.log(`no function found!`)
                return func(...args)
            }
        } else return func(...args)
    }
}