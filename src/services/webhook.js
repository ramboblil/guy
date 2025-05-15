const axios = require('axios');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const messageQueue = require('./messageQueue');

class WebhookService {
    constructor() {
        this.webhookUrl = config.webhook.url;
        this.isProcessing = false;
        this.processingInterval = null;
        console.log('Webhook URL configured as:', this.webhookUrl);
    }

    async initialize() {
        await messageQueue.initialize();
        // Start processing queued messages
        this.startProcessingQueue();
    }

    async sendMessage(phoneNumber, message) {
        try {
            // Add to persistent queue first
            await messageQueue.addToQueue(phoneNumber, message);
            
            // Start processing if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
        } catch (error) {
            console.error('Error queueing message:', error);
            throw error;
        }
    }

    startProcessingQueue() {
        // Process queue immediately and then every 30 seconds
        this.processQueue();
        this.processingInterval = setInterval(() => this.processQueue(), 30000);
    }

    async processQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        try {
            const queuedFiles = await messageQueue.getQueuedMessages();
            
            for (const filePath of queuedFiles) {
                if (messageQueue.shutdownRequested) {
                    break;
                }
                
                try {
                    // Read message from queue
                    const data = await fs.readFile(filePath, 'utf8');
                    const messageData = JSON.parse(data);
                    
                    // Try to send the message
                    await this.sendToWebhook(messageData.phoneNumber, messageData.message);
                    
                    // If successful, remove from queue
                    await messageQueue.removeFromQueue(filePath);
                } catch (error) {
                    // Handle failed attempts
                    console.error('Error processing queued message:', error);
                    
                    try {
                        // Read the file again (it might have been updated)
                        const data = await fs.readFile(filePath, 'utf8');
                        const messageData = JSON.parse(data);
                        
                        // Record the failed attempt
                        await messageQueue.recordFailedAttempt(
                            messageData.phoneNumber, 
                            messageData.message, 
                            error
                        );
                        
                        // Increment attempt count
                        messageData.attempts = (messageData.attempts || 0) + 1;
                        
                        // If max retries reached, remove from queue
                        if (messageData.attempts >= 5) {
                            await messageQueue.removeFromQueue(filePath);
                        } else {
                            // Otherwise update the file with new attempt count
                            await fs.writeFile(filePath, JSON.stringify(messageData), 'utf8');
                        }
                    } catch (err) {
                        console.error('Error handling failed message:', err);
                    }
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    async sendToWebhook(phoneNumber, message) {
        // Only forward if the number starts with "972"
        if (!phoneNumber || !phoneNumber.startsWith('972')) {
            console.log(`Blocking webhook: Number does not start with 972 or is invalid. Number: ${phoneNumber}`);
            return; // Do not proceed if the number doesn't start with "972"
        }

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                // Format the payload specifically for n8n processing
                const payload = {
                    body: {
                        data: {
                            phoneNumber,
                            message,
                            timestamp: new Date().toISOString()
                        }
                    }  
                };

                console.log('Sending payload to n8n:', JSON.stringify(payload));

                const response = await axios.post(this.webhookUrl, payload, {
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                console.log('Message forwarded successfully:', {
                    phoneNumber,
                    status: response.status
                });

                return response.data;
            } catch (error) {
                attempt++;
                console.error(`Webhook attempt ${attempt} failed:`, {
                    phoneNumber,
                    error: error.message,
                    responseData: error.response?.data,
                    status: error.response?.status
                });

                if (attempt === maxRetries) {
                    throw new Error(`Failed to send message after ${maxRetries} attempts`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    async shutdown() {
        // Clear processing interval
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        
        // Wait for message queue to finish processing
        await messageQueue.shutdown();
        
        console.log('Webhook service shutdown complete');
    }
}

module.exports = new WebhookService();
