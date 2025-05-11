# WhatsApp Webhook Integration Server

This Node.js application integrates WhatsApp Web with Zoko's webhook service, allowing for automated message forwarding from approved contacts.

## Features

- WhatsApp Web integration using unofficial API
- Real-time message monitoring
- Contact filtering system
- Webhook integration with Zoko
- Robust error handling and logging
- Contact management API endpoints
- Graceful shutdown handling

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A WhatsApp account
- Zoko webhook URL and API key

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd whatsapp-webhook-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Configure the `.env` file with your settings:
   ```
   WHATSAPP_SESSION_DATA_PATH=./session.json
   WEBHOOK_URL=https://api.zoko.io/v2/webhook/your-endpoint
   WEBHOOK_API_KEY=your-api-key
   PORT=3000
   CONTACTS_DB_PATH=./data/contacts.json
   LOG_LEVEL=info
   ```

## Usage

### Starting the Server

1. Start in development mode:
   ```bash
   npm run dev
   ```

2. Start in production mode:
   ```bash
   npm start
   ```

### WhatsApp Authentication

1. When you first start the server, a QR code will be displayed in the console
2. Scan this QR code with WhatsApp on your phone
3. Once authenticated, the server will maintain the session

### Managing Contacts

Add a contact:
```bash
curl -X POST http://localhost:3000/contacts \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890"}'
```

Remove a contact:
```bash
curl -X DELETE http://localhost:3000/contacts/1234567890
```

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /contacts` - Add a new approved contact
- `DELETE /contacts/:phoneNumber` - Remove an approved contact

## Logging

Logs are written to:
- `error.log` - Error-level logs
- `combined.log` - All logs
- Console output - All logs (development)

## Security Considerations

1. Store sensitive data in environment variables
2. Keep your `.env` file secure and never commit it
3. Regularly rotate your Zoko API key
4. Monitor the logs for suspicious activity
5. Keep the WhatsApp session data secure

## Troubleshooting

1. If authentication fails:
   - Delete the session.json file
   - Restart the server
   - Scan the QR code again

2. If messages aren't being forwarded:
   - Check the contact is in the approved list
   - Verify the webhook URL and API key
   - Check the error logs

3. If the server crashes:
   - Check the error logs
   - Verify all environment variables are set
   - Ensure sufficient system resources

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 