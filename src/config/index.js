require('dotenv').config();

module.exports = {
    webhook: {
        url: process.env.WEBHOOK_URL
    },
    server: {
        port: process.env.PORT || 3000
    }
}; 