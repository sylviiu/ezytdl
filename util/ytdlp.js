const child_process = require('child_process');
const fs = require('fs');
const yargs = require('yargs');
const { compareTwoStrings } = require('string-similarity');
const idGen = require(`../util/idGen`);
const downloadManager = require(`./downloadManager`);
const authentication = require(`../core/authentication`);

const outputTemplateRegex = /%\(\s*([^)]+)\s*\)s/g;

const durationCurve = require(`animejs`).easing(`easeInExpo`);

const platforms = fs.readdirSync(require(`../util/getPath`)(`./util/platforms`)).map(f => (Object.assign(require(`../util/platforms/${f}`), {
    name: f.split(`.`).slice(0, -1).join(`.`)
})));

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
    if(module.exports.ffmpegPath && fs.existsSync(module.exports.ffmpegPath)) {
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

refreshFFmpeg();

const time = require(`../util/time`);

const { updateStatus, updateStatusPercent } = downloadManager.default;

const sendNotification = require(`../core/sendNotification`);

const sendUpdates = (proc, initialMsg) => {
    //downloading item {num} of {num}

    //console.log(`sending updates...`);

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
}

module.exports = {
    ffmpegPath: null,
    sendUpdates,
    hasFFmpeg: () => refreshFFmpeg(),
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
                updateStatusPercent([queue.complete.length, totalLength]);
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

        if(info.entries) for(const i in info.entries.filter(e => !e.fullInfo)) {
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
        if(!template) template = require(`../getConfig`)().outputFilename;
      
        template = template.replace(outputTemplateRegex, (match, key) => {
            const capturedKeys = key.split(`,`).map(s => s.trim())
            for (const key of capturedKeys) {
                console.log(match, key);
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
        // sanitizePath(...currentConfig.saveLocation.split(`\\`).join(`/`).split(`/`))
        const { saveLocation, downloadInWebsiteFolders } = require(`../getConfig`)();

        const useSaveLocation = sanitizePath(...saveLocation.split(`\\`).join(`/`).split(`/`));

        const paths = [ useSaveLocation ];

        let parsedURL = require(`url`).parse(info._original_url || info.url || info.webpage_url || info._request_url || ``);

        let useURL = parsedURL.host ? parsedURL.host.split(`.`).slice(-2).join(`.`) : info.webpage_url_domain || null;

        if(downloadInWebsiteFolders && useURL) paths.push(useURL);

        if(filePath) paths.push(filePath)

        const saveTo = sanitizePath(...paths) + (require('os').platform() == `win32` ? `\\` : `/`)

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
            d.formats = d.formats.map(o => {
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
            }).sort((a, b) => {
                if(a.audio && a.video) {
                    return -1;
                } else if(b.audio && b.video) {
                    return 1;
                } else if(a.audio && !a.video) {
                    return -1;
                } else if(b.audio && !b.video) {
                    return 1;
                } else if(a.video && !a.audio) {
                    return -1;
                } else if(b.video && !b.audio) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }

        d.duration = time(totalTime || 0);

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
    listFormats: ({query, extraArguments, ignoreStderr}) => new Promise(async res => {
        const additional = module.exports.additionalArguments(extraArguments);

        console.log(`url "${query}"; additional args: "${additional.join(`", "`)}"`)

        let args = [query, `--dump-single-json`, `--flat-playlist`, `--quiet`, `--progress`, `--verbose`, ...additional];

        if(ignoreStderr) args.splice(args.indexOf(`--verbose`), 1);

        //if(!disableFlatPlaylist) args.push(`--flat-playlist`);

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
        const { outputFilename } = require(`../getConfig`)();

        let useTempalte = template || outputFilename;

        console.log(`getFilename / raw: "${useTempalte}"`)

        useTempalte = module.exports.parseOutputTemplate(Object.assign({}, (typeof format == `object` ? format : {}), info), useTempalte);

        console.log(`getFilename / before: "${useTempalte}"`)

        if(outputTemplateRegex.test(useTempalte) && fullParse) {
            return new Promise(async res => {
                console.log(`getFilename / template needs to be parsed!`)
    
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
                    console.log(`getFilename / getFilename closed with code ${code}`);
                    console.log(data)
                    console.log(`getFilename / after: "${data}"`)
                    res(data)
                })
            })
        } else {
            console.log(`getFilename / no need to parse template! (or noParse is true)`)

            useTempalte = useTempalte.replace(outputTemplateRegex, () => `${`Unknown`}`)

            console.log(`getFilename / after: "${useTempalte}"`)

            return useTempalte
        }
    },
    getCodec: (file, audio) => {
        let ffprobePath = require(`./filenames/ffmpeg`).getFFprobe();
        
        if(ffprobePath && fs.existsSync(ffprobePath)) {
            try {
                let a = child_process.execFileSync(ffprobePath, [`-v`, `error`, `-select_streams`, `${audio ? `a` : `v`}:0`, `-show_entries`, `stream=codec_name`, `-of`, `default=noprint_wrappers=1:nokey=1`, file]).toString().trim();
                if(a) {
                    return a.trim().split(`\n`)[0]
                } else return null;
            } catch(e) {
                return null;
            }
        } else return null
    },
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
            updateFunc({ latest: o, overall: obj }, proc);
            return obj;
        };

        let setProgress = (key, o) => {
            //Object.assign(obj, { progressBars: Object.assign({}, obj.progressBars, { [key]: o }) });
            Object.assign(obj, { [`progress-${key}`]: o })
            return update({})
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

            update({status: `Download canceled.`})

            resolve(obj)
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
            const currentConfig = require(`../getConfig`)();
            const { onlyGPUConversion, disableHWAcceleratedConversion, outputFilename, hardwareAcceleratedConversion } = currentConfig;

            let thisFormat;

            if(format == `bv*+ba/b`/* && (!module.exports.ffmpegPath || !convert)*/) format = null;

            if(info.is_live && (format == `bv*+ba/b` || format == `bv` || format == `ba`)) format = null;

            if(info.formats) {
                if(info.is_live && !info.formats.find(f => f.format_id == format)) {
                    format = null;
                    thisFormat = info.formats[0]
                } else thisFormat = info.formats.find(f => f.format_id == format) || info.formats[0]
            }

            const fullYtdlpFilename = sanitize(await module.exports.getFilename(url, info, thisFormat, outputFilename + `.%(ext)s`, true))

            const ytdlpSaveExt = fullYtdlpFilename.split(`.`).slice(-1)[0];

            const ytdlpFilename = fullYtdlpFilename.split(`.`).slice(0, -1).join(`.`);

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
    
            if(!module.exports.ffmpegPath || !ffmpegVideoCodecs) refreshFFmpeg();
    
            //console.log(saveLocation, filePath, ytdlpFilename)

            const saveTo = module.exports.getSavePath(info, filePath);

            update({ deleteFiles: () => purgeLeftoverFiles(saveTo), live: info.is_live ? true : false, destinationFilename: ytdlpFilename, formatID: format })
    
            fs.mkdirSync(saveTo, { recursive: true, failIfExists: false });
    
            let reasonConversionNotDone = null;
        
            killAttempt = 0;

            const additionalArgs = module.exports.additionalArguments(typeof extraArguments == `string` ? extraArguments : ``);

            let args = [...additionalArgs];

            const res = async (o) => {
                //console.log(o)
                update(Object.assign({}, typeof o == `object` ? o : {}, { percentNum: 100 }));
                const resolveStatus = obj.status;
                const skipped = {};
                new Promise(async r => {
                    let run = true;

                    if(killAttempt > 0) run = false;

                    const file = fs.readdirSync(saveTo).find(f => f.startsWith(ytdlpFilename) && !f.endsWith(`.meta`));
                    const target = file ? require(`path`).join(saveTo, file) : null;

                    const isWritable = () => {
                        try {
                            fs.accessSync(target, fs.constants.W_OK);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    }

                    if(run && addMetadata && module.exports.ffmpegPath && file && fs.existsSync(target)) {
                        console.log(`adding metadata...`)

                        setProgress(`metadata`, `Metadata`)

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
                            Object.entries(addMetadata).filter(v => v[1]).forEach(k => skipped[k[0]] = `File was locked (10 attempts were made).`);
                        } else {
                            const cleanup = (restoreOriginal) => {
                                if(fs.existsSync(target + `.ezytdl`) && !fs.existsSync(target)) {
                                    update({status: `Restoring original file...`})
                                    console.log(`-- restoring ${target + `.ezytdl`}...`)
                                    fs.renameSync(target + `.ezytdl`, target);
                                } else if(fs.existsSync(target + `.ezytdl`) && fs.existsSync(target)) {
                                    if(restoreOriginal) {
                                        update({status: `Rolling back changes...`})
                                        console.log(`-- restoring ${target}...`)
                                        if(fs.existsSync(target)) fs.unlinkSync(target);
                                        fs.renameSync(target + `.ezytdl`, target);
                                    } else {
                                        update({status: `Removing temporary file...`})
                                        console.log(`-- removing ${target + `.ezytdl`}...`)
                                        if(fs.existsSync(target + `.ezytdl`)) fs.unlinkSync(target + `.ezytdl`);
                                    }
                                }
                                
                                if(fs.existsSync(target + `.songcover`)) {
                                    update({status: `Removing temporary thumbnail file...`})
                                    console.log(`-- removing ${target + `.songcover`}...`)
                                    fs.unlinkSync(target + `.songcover`);
                                }
                                
                                if(fs.existsSync(target + `.png`)) {
                                    update({status: `Removing temporary thumbnail file...`})
                                    console.log(`-- removing ${target + `.png`}...`)
                                    fs.unlinkSync(target + `.png`);
                                }
                            }
                            
                            if(addMetadata.tags) await new Promise(async r => {
                                fs.renameSync(target, target + `.ezytdl`);
    
                                let tags = [];

                                if(!info.fullInfo) {
                                    setProgress(`tags`, {progressNum: -1, status: `Getting full metadata...`})
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
    
                                const meta = [];
    
                                tags.forEach(t => meta.push(`-metadata`, `${t[0]}=${`${t[1]}`.replace(/\n/g, `\r\n`)}`));
        
                                const args = [`-y`, `-ignore_unknown`, `-i`, target + `.ezytdl`, `-id3v2_version`, `3`, `-write_id3v1`, `1`, ...meta, `-c`, `copy`, target];
        
                                ////console.log(args);
        
                                const proc = child_process.execFile(module.exports.ffmpegPath, args);

                                proc.once(`spawn`, () => {
                                    setProgress(`tags`, {progressNum: 50, status: `Adding ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}... (FFmpeg spawned)`})
                                })
        
                                proc.on(`error`, e => {
                                    console.error(e)
    
                                    skipped.tags = `${e}`;

                                    deleteProgress(`tags`);
    
                                    cleanup(true);
                                    r()
                                });
        
                                proc.on(`close`, code => {
                                    console.log(`metadata added! (code ${code})`)
                                    setProgress(`tags`, {progressNum: 100, status: `Added ${tags.length} metadata tag${tags.length == 1 ? `` : `s`}`})
                                    cleanup(code === 0 ? false : true);
                                    r()
                                })
                            }).catch(e => {
                                console.error(e)
    
                                skipped.tags = `${e}`;
                                
                                deleteProgress(`tags`);
    
                                cleanup(true);
                            });

                            const foundCodec = module.exports.getCodec(target);
                            const vcodec = typeof info.video == `boolean` ? info.video : (foundCodec && !`${foundCodec}`.includes(`jpeg`) && !`${foundCodec}`.includes(`png`))

                            //console.log(`--------------\nfoundCodec: ${foundCodec}\nvcodec: ${vcodec}\ninfo.video: ${info.video}\n--------------`)

                            if(addMetadata.thumbnail && !vcodec) {
                                if(!(info.media_metadata.url.thumbnail_url || info.thumbnails) && info.fullInfo) {
                                    skipped.thumbnail = `No thumbnail found`;
                                    deleteProgress(`thumbnail`);
                                } else if(info.thumbnails || info.media_metadata.url.thumbnail_url) await new Promise(async r => {
                                    let progressNum = 15;
    
                                    fs.renameSync(target, target + `.ezytdl`);

                                    let thumbnailAttempts = 0;
                                    let successfulThumbnail = null;
                                    
                                    const continueWithThumbnail = () => {
                                        if(fs.existsSync(`${target + `.png`}`)) {
                                            progressNum = 65;
                                            setProgress(`thumbnail`, {progressNum, status: `Applying thumbnail...`})

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

                                                deleteProgress(`thumbnail`);
                
                                                cleanup(true);
                                                r();
                                            });
                    
                                            proc.on(`close`, code => {
                                                console.log(`song cover added! (code ${code})`)
                                                cleanup(code === 0 ? false : true);

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
                                                r();
                                            })
                                        } else {
                                            console.log(`failed to convert image to png!`)
                                            skipped.thumbnail = `Failed to convert thumbnail to PNG`;
                                            deleteProgress(`thumbnail`);
                                            cleanup(true);
                                            r();
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

                                            const req = require(`superagent`).get(thumbnail.url);
                
                                            req.pipe(fs.createWriteStream(target + `.songcover`));
        
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
                                }).catch(e => {
                                    console.error(e)
        
                                    skipped.thumbnail = `${e}`;

                                    deleteProgress(`thumbnail`);
        
                                    cleanup(true);
                                })
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
                        } else if(!file || !fs.existsSync(target)) {
                            Object.entries(addMetadata).filter(v => v[1] && !v[0].startsWith(`opt-`)).forEach(k => skipped[k[0]] = `File wasn't found.`);
                        }
                    }
    
                    r();
                }).then(() => {
                    if(Object.keys(skipped).length == Object.keys(addMetadata || {}).filter(v => v).length) deleteProgress(`metadata`);
                    const status = resolveStatus + (Object.keys(skipped).length > 0 ? `<br><br>${Object.entries(skipped).map(s => `- Skipped ${s[0]} embed: ${s[1]}`).join(`<br>`)}` : ``);
                    //console.log(`-------------\n${status}\n-------------`)
                    resolve(update({status, percentNum: 100}))
                })
            }

            const runThroughFFmpeg = async (code, replaceInputArgs) => {
                let previousFilename = obj.destinationFile ? `ezytdl` + obj.destinationFile.split(`ezytdl`).slice(-1)[0] : temporaryFilename;

                const fallback = (msg, deleteFile) => {
                    try {
                        console.log(`ffmpeg did not save file, renaming temporary file`);
                        if(deleteFile) {
                            if(fs.existsSync(saveTo + previousFilename)) fs.unlinkSync(saveTo + previousFilename)
                        } else {
                            if(fs.existsSync(saveTo + previousFilename)) fs.renameSync(saveTo + previousFilename, require(`path`).join(saveTo, ytdlpFilename) + `.` + previousFilename.split(`.`).slice(-1)[0]);
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
    
                if(!fs.existsSync(previousFilename)) previousFilename = await module.exports.getFilename(url, info, thisFormat, temporaryFilename + `.%(ext)s`, true);
    
                filenames.push(previousFilename)

                const temporaryFiles = fs.readdirSync(saveTo).filter(f => f.startsWith(temporaryFilename) && !f.endsWith(`.part`) && !f.endsWith(`.meta`));

                filenames.push(...temporaryFiles)

                if(convert) {
                    for(const key of Object.keys(convert)) {
                        if(typeof convert[key] != `boolean` && !convert[key]) delete convert[key] // remove any falsy values
                    }

                    console.log(`convert`, convert)

                    ext = `.${convert.ext || (thisFormat || {}).ext}`

                    const destinationCodec = await module.exports.getMuxer(ext.slice(1));

                    if(!destinationCodec.compatible) return fallback(`Could not convert to ${ext.toUpperCase()} -- unable to find muxer details.`, true);

                    const inputArgs = replaceInputArgs || [];

                    temporaryFiles.filter(f => fs.existsSync(require(`path`).join(saveTo, f))).forEach(file => inputArgs.push(`-i`, require(`path`).join(saveTo, file)));

                    console.log(temporaryFiles, inputArgs)

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

                    const outputArgs = [require(`path`).join(saveTo, ytdlpFilename) + ext];

                    if(convert.audioBitrate) outputArgs.unshift(`-b:a`, convert.audioBitrate);
                    if(convert.audioSampleRate) outputArgs.unshift(`-ar`, convert.audioSampleRate);
                    if(convert.videoBitrate) outputArgs.unshift(`-b:v`, convert.videoBitrate);
                    if(convert.videoFPS) outputArgs.unshift(`-r`, convert.videoFPS);
                    if(convert.videoResolution) outputArgs.unshift(`-vf`, `scale=${convert.videoResolution.trim().replace(`x`, `:`)}`);

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
    
                    const spawnFFmpeg = (rawArgs2, name) => new Promise(async (resolveFFmpeg, rej) => {
                        let args2 = rawArgs2.slice(0);

                        if(killAttempt > 0) {
                            update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                            return res(obj)
                            //purgeLeftoverFiles(saveTo)
                            //return res(`Download canceled.`, true);
                        }

                        let status = `Converting to ${(destinationCodec ? destinationCodec.name : null) || `${ext}`.toUpperCase()} using ${name}...`;

                        const additionalArgsFromConvert = [...(convert.additionalInputArgs || []), ...(convert.additionalOutputArgs || [])];

                        const additionalOpts = additionalArgsFromConvert.filter(s => s.startsWith(`-`)).map(s => s.slice(1));

                        status += (additionalArgsFromConvert.length > 0 ? `<br>(using extra processing: ${additionalOpts.join(`, `)})` : ``) + `<br><br>- ${Object.keys(convert).filter(s => convert[s]).map(s => `${s}: ${convert[s] || `(no conversion)`}`).join(`<br>- `)}`
    
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
                                //if(fs.existsSync(saveTo + previousFilename)) fs.unlinkSync(saveTo + previousFilename);
                                temporaryFiles.forEach(f => {
                                    if(fs.existsSync(require(`path`).join(saveTo, f))) fs.unlinkSync(require(`path`).join(saveTo, f));
                                })
                                update({percentNum: 100, status: `Done!`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format});
                                resolveFFmpeg(obj)
                            } else {
                                if(allLogs.includes(`Press [q] to stop, [?] for help`)) {
                                    rej(allLogs.split(`Press [q] to stop, [?] for help`)[1].trim())
                                } else rej(code)
                            }
                        })
                    });
    
                    const transcoders = {};

                    const transcodersArr = Object.entries(hardwareAcceleratedConversion).filter(v => v[1]).map(v => Object.assign({}, require(`./ffmpegGPUArgs.json`)[v[0]], { key: v[0] }));

                    for(const transcoder of transcodersArr) transcoders[transcoder.key] = transcoder;

                    transcoders.use = transcodersArr[0];

                    console.log(`transcoders: `, transcoders)
                    
                    obj.destinationFile = ytdlpFilename;

                    let originalVideoCodec = null;
                    let originalAudioCodec = null;

                    if(convert.videoCodec || destinationCodec.videoCodec) temporaryFiles.forEach(f => {
                        if(fs.existsSync(require(`path`).join(saveTo, f))) {
                            if(!originalVideoCodec) originalVideoCodec = module.exports.getCodec(require(`path`).join(saveTo, f))
                            if(!originalAudioCodec) originalAudioCodec = module.exports.getCodec(require(`path`).join(saveTo, f), true)
                        }
                    });

                    if(!originalVideoCodec) convert.forceSoftware = true;
    
                    console.log(`original obj: `, transcoders.use, `originalVideoCodec: `, originalVideoCodec, `originalAudioCodec:`, originalAudioCodec, `muxer: `, destinationCodec);

                    const originalCodec = originalVideoCodec || originalAudioCodec || `unknown`;
                    const targetCodec = convert.videoCodec || destinationCodec.codec;

                    if(convert.videoCodec && !ffmpegVideoCodecs.includes(convert.videoCodec)) {
                        return fallback(`Could not convert the video stream to ${convert.videoCodec.toString().toUpperCase()} -- target codec not supported by installed build of FFmpeg.`, true);
                    } else if(convert.audioCodec && !ffmpegVideoCodecs.includes(convert.audioCodec)) {
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
                                    string: `${originalCodec}_${decoder.string} -> ${targetCodec}_${encoder.string}`,
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
                                string: `${originalCodec}_${decoder.string} -> ${targetCodec}_software`,
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
                                string: `${originalCodec}_software -> ${targetCodec}_${encoder.string}`,
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
                            string: `${originalCodec}_software -> ${targetCodec}_software`,
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
                    if(killAttempt > 0) {
                        update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                        return res(obj)
                        //purgeLeftoverFiles(saveTo)
                    } else if(args.includes(`-S`) && ytdlpSaveExt == ext) {
                        update({code, saveLocation: saveTo, url, format, status: `Downloaded best quality provided for ${ext} format (no conversion done${reasonConversionNotDone ? ` -- ${reasonConversionNotDone}` : ``})`});
                    } else if(args.includes(`-S`) && ytdlpSaveExt != ext) {
                        update({code, saveLocation: saveTo, url, format, status: `${ext} was not provided by this website (downloaded ${ytdlpSaveExt} instead${reasonConversionNotDone ? ` -- ${reasonConversionNotDone}` : ``})`});
                    } else if(reasonConversionNotDone) {
                        update({code, saveLocation: saveTo, url, format, status: `Could not convert: ${reasonConversionNotDone}`});
                    } else update({code, saveLocation: saveTo, url, format, status: `Done!`});
                    res(obj)
                } else {
                    if(killAttempt > 0) {
                        update({failed: true, percentNum: 100, status: `Download canceled.`, saveLocation: saveTo, destinationFile: require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`, url, format})
                        return res(obj)
                        //purgeLeftoverFiles(saveTo)
                    } else {
                        update({code, saveLocation: saveTo, url, format, status: `Done!`})
                        res(obj)
                    }
                }
            };

            //console.log(`--- DOWNLOADING FORMAT (${format}) ---\n`, thisFormat)

            if(/*thisFormat && thisFormat.protocol && thisFormat.protocol.toLowerCase().includes(`m3u8`) && fs.existsSync(module.exports.ffmpegPath)*/ false) {
            } else {
                args = [`-f`, format, url, `-o`, require(`path`).join(saveTo, ytdlpFilename) + `.%(ext)s`, `--no-mtime`, ...additionalArgs];

                if(!format) args.splice(0, 2)
    
                args.push(`--ffmpeg-location`, ``);
        
                if(fs.existsSync(module.exports.ffmpegPath)) {
                    //args.push(`--ffmpeg-location`, module.exports.ffmpegPath);
                } else {
                    if(convert && convert.ext) {
                        ext = convert.ext
                        convert = false;
                        reasonConversionNotDone = `ffmpeg not installed`
                    };
                }
                
                if(convert && !ext) {
                    args.splice(args.indexOf(`-o`)+1, 1, args[args.indexOf(`-o`)+1].replace(ytdlpFilename, temporaryFilename))
                    //args[4] = args[4].replace(ytdlpFilename, temporaryFilename);
                    //args.splice(5, 2);
                } else {
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
            
                            args = [...(disableHWAcceleratedConversion ? [] : [`-hwaccel`, `auto`]), `-i`, thisFormat.url || url, `-movflags`, `+faststart`, `-c`, `copy`, `-y`, require(`path`).join(saveTo, ytdlpFilename) + `.mkv`];
            
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
            
                                proc = child_process.execFile(module.exports.ffmpegPath, [`-i`, require(`path`).join(saveTo, ytdlpFilename) + `.mkv`, `-c`, `copy`, `-y`, require(`path`).join(saveTo, ytdlpFilename) + `.${ext}`]);
            
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
                                        if(fs.existsSync(require(`path`).join(saveTo, ytdlpFilename) + `.mkv`)) fs.unlinkSync(require(`path`).join(saveTo, ytdlpFilename) + `.mkv`);
                                        update({code, saveLocation: saveTo, url, format, status: `Done!`})
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
            
            resultsInfo.entries.forEach(a => {
                console.log(`- ${a.media_metadata.general.title} - ${a.similarity}`, a.similarities)
            })

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

for(const entry of Object.entries(module.exports).filter(o => typeof o[1] == `function`)) {
    const name = entry[0];
    const func = entry[1];

    if(!module.exports.ytdlp) module.exports.ytdlp = {};

    module.exports.ytdlp[name] = func;

    module.exports[name] = (...args) => {
        const authType = authentication.check(typeof args[0] == `object` && typeof args[0].query == `string` ? args[0].query : ``)
        if(typeof args[0] == `object` && args[0].query && authType) {
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