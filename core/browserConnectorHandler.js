module.exports = ({ session, id }) => {
    console.log(`[extension/${id}] creating message handler...`);

    return ({ type, data }) => {
        console.log(`[extension/${id} AUTHED] received message! (type: ${type})`, data);
    }
}