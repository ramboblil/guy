const express = require('express');
const config = require('./config');
const whatsappService = require('./services/whatsapp');
const webhookService = require('./services/webhook');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

async function startServer() {
    try {
        // Initialize webhook service (with persistent queue)
        await webhookService.initialize();

        // Initialize WhatsApp service
        await whatsappService.initialize();

        // Start Express server
        app.listen(config.server.port, () => {
            console.log(`Server is running on port ${config.server.port}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received. Starting graceful shutdown...');
            
            // Shutdown in correct order
            await webhookService.shutdown();
            await whatsappService.destroy();
            
            console.log('Graceful shutdown complete.');
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log('SIGINT received. Starting graceful shutdown...');
            
            // Shutdown in correct order
            await webhookService.shutdown();
            await whatsappService.destroy();
            
            console.log('Graceful shutdown complete.');
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 