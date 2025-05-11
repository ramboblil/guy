const NodeCache = require('node-cache');

class RateLimitService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 24 * 60 * 60 });
    }

    canSendMessage(phoneNumber) {
        const key = `message_${phoneNumber}`;
        if (this.cache.has(key)) {
            return false;
        }
        this.cache.set(key, true);
        return true;
    }
}

module.exports = new RateLimitService(); 