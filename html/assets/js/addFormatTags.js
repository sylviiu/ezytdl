const formatToTags = (format) => {
    const tags = [];

    if(format.format) tags.push(format.format);
    if(format.dynamic_range) tags.push(format.dynamic_range);
    if(format.abr) tags.push(`${format.abr}kbps`);
    if(format.acodec) tags.push(format.acodec);
    if(format.vcodec) tags.push(format.vcodec);

    return tags
}