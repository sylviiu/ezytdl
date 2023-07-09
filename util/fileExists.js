module.exports = ({query, force}={}) => {
    if(!force && query) {
        try {
            const stat = require('fs').statSync(query);

            require(`../core/sendNotification`)({
                headingText: `Path found!`,
                bodyText: `Did you mean to ${stat.isFile() ? `convert a file` : `batch convert the files in that folder`}? If so, use the Convert tab at the top! Otherwise, try again.`,
                redirect: `tab:Convert`,
                redirectMsg: `Go to the Convert tab`
            });

            return true;
        } catch(e) {
            return false;
        }
    } else return false;
}