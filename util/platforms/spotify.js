const superagent = require('superagent');

const { updateStatus, updateStatusPercent } = require(`../downloadManager`).default;

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
            console.log(body);

            let n = 0;

            if(body.tracks) while(body.tracks.next) {
                n++;
                console.log(`next page (${n})`);
                updateStatus(`Retrieving additional tracks...`);
                updateStatusPercent([body.tracks.items.length, body.tracks.total]);
                const next = await superagent.get(body.tracks.next).set('Authorization', `${token_type} ${access_token}`);
                body.tracks.items = body.tracks.items.concat(next.body.tracks.items);
                body.tracks.next = next.body.tracks.next;
            };

            res(body);
        };

        const endpoints = [ `tracks`, `albums`, `artists`, `playlists` ];

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

                const url = `https://api.spotify.com/v1/${endpoint}/${encodeURIComponent(use)}`;

                updateStatus(`Resolving ${endpoint.endsWith(`s`) ? endpoint.slice(0, -1) : endpoint} with "${use}"...`);
                updateStatusPercent([i+1, endpoints.length]);

                console.log(url)

                superagent.get(url).set('Authorization', `${token_type} ${access_token}`).then(async response => {
                    if(response.body && !response.body.error) body = response.body;
                    res();
                }).catch(e => {
                    console.error(`${e}`);
                    res();
                });
            });

            if(body) break;
        };

        if(body) {
            parse();
        } else res(null);
    }),
    listFormats: ({ access_token, token_type }, { query, ignoreStderr }) => new Promise(async res => {
        module.exports.resolve({ access_token, token_type }, { query, ignoreStderr }).then(obj => {
            if(!obj) return res(null);

            const retObj = {type: obj.type || `Listing`, thumbnails: []};

            if(obj.copyrights) retObj.license = obj.copyrights[0].text;

            const parseTrack = (track) => {
                const parsed = {
                    title: track.name,
                    artist: (track.artists || (track.album && track.album.artists ? track.album.artists : obj.artists))[0].name,
                    artist_url: (track.artists || (track.album && track.album.artists ? track.album.artists : obj.artists))[0].external_urls.spotify,
                    album: track.album ? track.album.name : null,
                    license: track.copyrights ? track.copyrights[0].text : null,
                    duration: track.duration_ms / 1000,
                    id: track.id,
                    thumbnails: (track.album && track.album.images ? track.album.images : track.images ? track.images : obj.images ? obj.images : null).reverse(),
                    url: track.external_urls.spotify,
                };

                parsed.creator = parsed.artist;
                parsed.creator_url = parsed.artist_url;

                return parsed;
            };

            if(obj.tracks && obj.tracks.items && obj.tracks.items.length > 0) {
                retObj.entries = obj.tracks.items.map(parseTrack);
            };

            Object.assign(retObj, parseTrack(obj));
            
            res(retObj);
        });
    })
}