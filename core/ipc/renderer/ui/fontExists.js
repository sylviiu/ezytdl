module.exports = {
    type: `on`,
    func: (e, name) => {
        console.log(`[IPC] Font exists request received (${name})`);
    
        const exists = document.fonts.check(`1em ${name}`);
    
        e.sender.send(`fontExists-${name}`, exists);
        
        console.log(`[IPC] Font exists request sent (${name})`);
    }
}