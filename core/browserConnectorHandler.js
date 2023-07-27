module.exports = ({ session, id }) => {
    return ({ type, data }) => {
        console.log(`[extension/${id} AUTHED] received message! (type: ${type})`);
    }
}