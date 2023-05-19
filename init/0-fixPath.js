module.exports = () => new Promise(async res => {
    res(true);
    
    console.log(`Current path:`, process.env.PATH);
    const fixPath = await import('fix-path');
    console.log(fixPath)
    fixPath.default()
    console.log(`New path:`, process.env.PATH)
    return true;
})