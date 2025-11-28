const { updateStatus, updateStatusPercent } = require(`../downloadManager`).default;

// extend will just be the api token stuff
const parseTrack = (obj, track, extend) => {
    if(!track.album && obj?.type == `album`) track.album = obj;

    const parsed = {
        title: track.name,
        artist: ((track.artists || (track.album && track.album.artists ? track.album.artists : obj.artists)) || [{name: null}])[0].name,
        artist_url: ((track.artists || (track.album && track.album.artists ? track.album.artists : obj.artists)) || [{external_urls: {spotify: null}}])[0].external_urls.spotify,
        album: track.album ? track.album.name : null,
        license: track.copyrights ? track.copyrights[0].text : null,
        duration: track.duration_ms / 1000,
        id: track.id,
        thumbnails: (track.album && track.album.images ? track.album.images : track.images ? track.images : obj.images ? obj.images : []).sort((a, b) => a.width < b.width ? 1 : -1).reverse(),
        url: track.external_urls ? track.external_urls.spotify : null,
        entry_number: track.album ? track.track_number : null,
        entry_total: track.album ? track.album.total_tracks : null,
        type: track.type,
        _type: track.type,
    };

    parsed.creator = parsed.artist;
    parsed.creator_url = parsed.artist_url;

    if(track.tracks && track.tracks.items && track.tracks.items.length > 0) {
        parsed.entries = obj.tracks.items.map(o => parseTrack(obj, o));
    } else if(track.items && track.items.length > 0) {
        parsed.entries = obj.items.map(o => parseTrack(obj, o));
    };

    if(extend) {
        return new Promise(async res => {
            console.log(`extending`)

            if(track.type == `artist`) {
                parsed.entries = (await module.exports.resolve(extend, { query: track.id, ignoreStderr: true, useEndpoint: `artists/%(url)s/albums?include_groups=album` })).items.map(o => parseTrack(o));
            };

            res(parsed);
        })
    } else {
        if(track.type == `album` || track.type == `playlist` && !parsed.entries) {
            parsed.entries = [{album: true}];
        }

        return parsed;
    }
};

module.exports = {
    resolve: ({ access_token, token_type }, { query, ignoreStderr, count, useEndpoint }) => new Promise(async (res) => {
        const id = (query.includes(`/`) ? query.split(`/`).pop() : query.includes(`:`) ? query.split(`:`).pop() : query).split(`?`)[0]

        const parsedURL = require(`url`).parse(query, true);

        if(!ignoreStderr) {
            updateStatus(`Resolving Spotify URL...`);
            updateStatusPercent([-1, 0])
        };

        let body = null;

        const parse = async () => {
            let n = 0;

            if(body.tracks) while(body.tracks.next) {
                n++;
                console.log(`next page (${n})`);
                if(!ignoreStderr) {
                    updateStatus(`Retrieving additional tracks...`);
                    updateStatusPercent([body.tracks.items.length, body.tracks.total]);
                }
                const next = await fetch(body.tracks.next, { headers: { 'Authorization': `${token_type} ${access_token}` } }).then(r => r.json());
                body.tracks.items.push(...next.body.items);
                body.tracks.next = next.body.next;
            };

            if(body.tracks && body.tracks.items && body.tracks.items[0].track) body.tracks.items = body.tracks.items.map((o, i) => Object.assign(body.tracks.items[i], o.track, {track: null}));

            n = 0;

            while(body.next) {
                n++;
                console.log(`next page (${n})`);
                if(!ignoreStderr) {
                    updateStatus(`Retrieving additional tracks...`);
                    updateStatusPercent([body.items.length, body.total]);
                }
                const next = await fetch(body.next, { headers: { 'Authorization': `${token_type} ${access_token}` } })
                body.items.push(...next.body.items);
                body.next = next.body.next;
            };

            if(body.items && body.items[0].track) body.items = body.items.map((o, i) => Object.assign(body.items[i], o.track, {track: null}));

            res(body);
        };

        let endpoints = [ `tracks`, `albums`, `artists`, `playlists/%(url)s/tracks` ];

        if(useEndpoint) {
            endpoints = [ useEndpoint ]
        } else if(parsedURL.pathname) {
            const n = parsedURL.pathname.split(`/`).slice(1, 2).join(``) + `s`;
            console.log(`prioritizing ${n}`);

            if(endpoints.indexOf(n) != -1) endpoints.splice(endpoints.indexOf(n), 1);

            endpoints.unshift(n)
        }

        for(const i in endpoints) {
            const endpoint = endpoints[i];

            await new Promise(async res => {
                const use = useEndpoint ? query : id;

                let url = `https://api.spotify.com/v1/${endpoint.includes(`%(url)s`) ? endpoint.replace(`%(url)s`, encodeURIComponent(use)) : endpoint + `/${encodeURIComponent(use)}`}`;

                if(!ignoreStderr) {
                    updateStatus(`Resolving ${endpoint.endsWith(`s`) ? endpoint.slice(0, -1) : endpoint} with "${use}"...`);
                    updateStatusPercent([i+1, endpoints.length]);
                }

                console.log(url);

                fetch(url, { headers: { 'Authorization': `${token_type} ${access_token}` } }).then(async r => {
                    if(r.status == 200) {
                        r.json().then(async response => {
                            if(response.body && !response.body.error) body = response.body;
                            res();
                        }).catch(e => {
                            console.error(`${e}`);
                            res();
                        });
                    } else {
                        console.error(`spotify returned code ${r.status}`);
                        res();
                    }
                })
            });

            if(body) break;
        };

        if(body) {
            parse();
        } else res(null);
    }),
    listFormats: ({ access_token, token_type }, { query, ignoreStderr }) => new Promise(async res => {
        module.exports.resolve({ access_token, token_type }, { query, ignoreStderr }).then(async obj => {
            if(!obj) return res(null);

            const retObj = {type: obj.type || `Listing`, thumbnails: []};

            if(obj.copyrights) retObj.license = obj.copyrights[0].text;

            Object.assign(retObj, await parseTrack(obj, obj, { access_token, token_type }));

            console.log(retObj)
            
            res(retObj);
        });
    }),
    search: ({ access_token, token_type }, { query, count }) => new Promise(async res => {
        fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${Math.min(50, count)}`, {
            headers: {
                Authorization: `${token_type} ${access_token}`
            }
        }).then(r => r.json()).then(async r => {
            const parsed = await parseTrack(r, r, { access_token, token_type });
            res(Object.assign(parsed, {
                extractor: `spotify:search`,
                extractor_key: `SpotifySearch`,
                title: query,
            }));
        }).catch(e => {
            console.error(`search error: ${e}`);
            res(null)
        })
    }),
    musicdata: ({ access_token, token_type }, id) => new Promise(async res => {
        fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
            headers: { Authorization: `${token_type} ${access_token}` }
        }).then(r => r.json()).then(async r => {
            res(r);
        }).catch(e => {
            console.error(`musicdata error: ${e}`);
            res(null)
        })
    })
}