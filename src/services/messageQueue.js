const fs = require('fs').promises;
const path = require('path');

class MessageQueue {
    constructor() {
        this.queueDir = path.join(process.cwd(), '.message_queue');
        this.failedAttemptsDir = path.join(process.cwd(), '.failed_attempts');
        this.processing = false;
        this.shutdownRequested = false;
    }

    async initialize() {
        try {
            // Ensure queue directory exists
            await fs.mkdir(this.queueDir, { recursive: true });
            await fs.mkdir(this.failedAttemptsDir, { recursive: true });
            console.log('Message queue initialized');
        } catch (error) {
            console.error('Error initializing message queue:', error);
            throw error;
        }
    }

    async addToQueue(phoneNumber, message) {
        try {
            const timestamp = Date.now();
            const filename = `${timestamp}_${phoneNumber}.json`;
            const filePath = path.join(this.queueDir, filename);
            
            const data = JSON.stringify({
                phoneNumber,
                message,
                timestamp: new Date().toISOString(),
                attempts: 0
            });
            
            await fs.writeFile(filePath, data, 'utf8');
            return filename;
        } catch (error) {
            console.error('Error adding message to queue:', error);
            throw error;
        }
    }

    async recordFailedAttempt(phoneNumber, message, error) {
        try {
            const timestamp = Date.now();
            const filename = `${timestamp}_${phoneNumber}.json`;
            const filePath = path.join(this.failedAttemptsDir, filename);
            
            const data = JSON.stringify({
                phoneNumber,
                message,
                timestamp: new Date().toISOString(),
                error: error.message || 'Unknown error'
            });
            
            await fs.writeFile(filePath, data, 'utf8');
            console.log(`Recorded failed attempt for ${phoneNumber}`);
        } catch (err) {
            console.error('Error recording failed attempt:', err);
        }
    }

    async getQueuedMessages() {
        try {
            const files = await fs.readdir(this.queueDir);
            return files.map(file => path.join(this.queueDir, file));
        } catch (error) {
            console.error('Error reading queued messages:', error);
            return [];
        }
    }

    async removeFromQueue(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error('Error removing message from queue:', error);
        }
    }

    async shutdown() {
        this.shutdownRequested = true;
        console.log('Message queue shutdown requested');
        
        // Wait for processing to complete
        if (this.processing) {
            console.log('Waiting for message processing to complete...');
            while (this.processing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log('Message queue shutdown complete');
    }
}

module.exports = new MessageQueue(); 