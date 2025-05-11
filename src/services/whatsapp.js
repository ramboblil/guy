const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    isJidGroup,
    isJidBroadcast,
    isJidStatusBroadcast      // catches “status@broadcast”
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const config = require('../config');
const webhookService = require('./webhook');
const rateLimitService = require('./rateLimit');
const path = require('path');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.sessionDir = path.join(process.cwd(), '.auth_info_baileys');
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 10;
        this.isShuttingDown = false;
        this.qrShown = false;
    }

    async initialize() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
            
            const startSock = async () => {
                if (this.isShuttingDown) return;

                this.client = makeWASocket({
                    auth: state,
                    printQRInTerminal: true,
                    logger: pino({ level: 'silent' }),
                    browser: ['Google Chrome (Windows)', '', ''],
                    connectTimeoutMs: 60000,
                    qrTimeout: 999999999,
                    defaultQueryTimeoutMs: 60000,
                    keepAliveIntervalMs: 10000,
                    emitOwnEvents: true,
                    retryRequestDelayMs: 2000
                });

                this.client.ev.on('creds.update', saveCreds);

                this.client.ev.on('connection.update', (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    
                    if (qr && !this.qrShown) {
                        console.log('Scan the QR code above to connect. It will remain valid until you connect.');
                        this.qrShown = true;
                    }
                    
                    if (connection === 'close') {
                        if (this.isShuttingDown) {
                            console.log('Connection closed due to shutdown');
                            return;
                        }

                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                             this.connectionRetries < this.maxRetries;
                        
                        if (shouldReconnect) {
                            this.connectionRetries++;
                            console.log(`Connection attempt ${this.connectionRetries} of ${this.maxRetries}`);
                            setTimeout(() => startSock(), 2000 * this.connectionRetries);
                        } else if (statusCode === DisconnectReason.loggedOut) {
                            console.log('Client logged out, please scan QR code again');
                            this.connectionRetries = 0;
                            this.qrShown = false;
                            startSock();
                        } else {
                            console.log('Max reconnection attempts reached or client logged out');
                        }
                    } else if (connection === 'open') {
                        this.isConnected = true;
                        this.connectionRetries = 0;
                        this.qrShown = false;
                        console.log('WhatsApp connected successfully!');
                    }
                });

                this.client.ev.on('messages.upsert', async ({ messages, type }) => {
                    if (!this.isConnected) return;
                    
                    if (type === 'notify') {
                        for (const message of messages) {
                            const remoteJid = message.key.remoteJid || '';

                            // ignore groups, broadcast lists & Status updates
                            if (
                                isJidGroup(remoteJid) ||
                                isJidBroadcast(remoteJid) ||
                                isJidStatusBroadcast(remoteJid)
                            ) continue;

                            try {
                                if (!message.key.fromMe && message.message) {
                                    const phoneNumber = message.key.remoteJid.split('@')[0];
                                    const messageContent = message.message?.conversation ||
                                        message.message?.extendedTextMessage?.text ||
                                        message.message?.imageMessage?.caption ||
                                        '';

                                    if (messageContent && rateLimitService.canSendMessage(phoneNumber)) {
                                        await webhookService.sendMessage(phoneNumber, messageContent);
                                    }
                                }
                            } catch (error) {
                                console.error('Error processing message:', error);
                            }
                        }
                    }
                });
            };

            await startSock();
        } catch (error) {
            console.error('WhatsApp initialization error:', error);
            throw error;
        }
    }

    async destroy() {
        this.isShuttingDown = true;
        console.log('WhatsApp service shutdown initiated');

        // Allow time for any in-progress operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (this.client) {
            try {
                // Close all pending connections
                this.client.ev.removeAllListeners('connection.update');
                this.client.ev.removeAllListeners('messages.upsert');
                this.client.ev.removeAllListeners('creds.update');
                
                // Attempt to properly logout
                this.client.ws.close();
                console.log('WhatsApp disconnected');
            } catch (error) {
                console.error('Error during WhatsApp client shutdown:', error);
            } finally {
                // Ensure client is nullified even if logout fails
                this.client = null;
            }
        }
        
        console.log('WhatsApp service shutdown complete');
    }
}

module.exports = new WhatsAppService();
