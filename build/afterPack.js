const child_process = require('child_process');

module.exports = (context) => {
    try {
        child_process.execSync(`git reset --hard`);
    } catch(e) {
        console.log(`Failed resetting repo: ${e}`)
    }
}