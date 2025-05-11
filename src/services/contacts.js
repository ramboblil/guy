const fs = require('fs').promises;
const config = require('../config');
const logger = require('../utils/logger');

class ContactsService {
    constructor() {
        this.contacts = new Set();
        this.dbPath = config.contacts.dbPath;
    }

    async initialize() {
        try {
            await this.loadContacts();
            logger.info('Contacts loaded successfully');
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('No contacts database found, creating new one');
                await this.saveContacts();
            } else {
                logger.error('Error initializing contacts:', error);
                throw error;
            }
        }
    }

    async loadContacts() {
        const data = await fs.readFile(this.dbPath, 'utf8');
        const contacts = JSON.parse(data);
        this.contacts = new Set(contacts);
    }

    async saveContacts() {
        const data = JSON.stringify(Array.from(this.contacts), null, 2);
        await fs.writeFile(this.dbPath, data, 'utf8');
    }

    isApprovedContact(phoneNumber) {
        return this.contacts.has(phoneNumber);
    }

    async addContact(phoneNumber) {
        this.contacts.add(phoneNumber);
        await this.saveContacts();
        logger.info(`Added new contact: ${phoneNumber}`);
    }

    async removeContact(phoneNumber) {
        this.contacts.delete(phoneNumber);
        await this.saveContacts();
        logger.info(`Removed contact: ${phoneNumber}`);
    }
}

module.exports = new ContactsService(); 