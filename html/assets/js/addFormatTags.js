const formatToTags = (format) => {
    const filesize = format.filesize || format.filesize_approx || null;

    const tags = {
        format: format.format_note || format.format_id,
        filesize: filesize ? filesize/1e+6 + `mb` : null,
        drm: format.has_drm ? true : false,
        meta: {
            video: {},
            audio: {},
        },
        extra: [],
    };
    
    if(format.language) tags.format = format.language + ` / ${tags.format}`;
    
    if(format.vcodec) tags.meta.video['Codec'] = format.vcodec;
    if(format.video_ext) tags.meta.video['Extension'] = format.video_ext;
    if(format.width && format.height) tags.meta.video['Resolution'] = `${format.width}x${format.height}`;
    if(format.dynamic_range) tags.meta.video['Dynamic Range'] = format.dynamic_range;
    if(format.fps) tags.meta.video['FPS'] = format.fps;
    if(format.vbr) tags.meta.video['Bitrate'] = format.vbr;

    if(format.acodec) tags.meta.audio['Codec'] = format.acodec;
    if(format.audio_ext) tags.meta.audio['Extension'] = format.audio_ext;
    if(format.asr) tags.meta.audio['Sample Rate'] = format.asr;
    if(format.abr) tags.meta.audio['Bitrate'] = format.abr;
    if(format.audio_channels) tags.meta.audio['Channels'] = format.audio_channels;

    // extra below

    if(format.format_id) tags.extra.push(`Format ID: ${format.format_id}`);
    if(format.protocol) tags.extra.push(`Protocol: ${format.protocol}`);
    if(format.fragments && format.fragments.length) tags.extra.push(`Fragments: ${format.fragments.length}`);
    if(format.quality) tags.extra.push(`Quality: ${format.quality}`);

    console.log(tags)

    return tags
}