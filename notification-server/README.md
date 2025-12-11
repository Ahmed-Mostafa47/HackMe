# Real-Time Notification Server

Socket.io server for delivering real-time notifications to users.

## Installation

```bash
cd notification-server
npm install
```

## Configuration

Create a `.env` file (optional):

```
PORT=3001
NOTIFICATION_SECRET=your-secret-token-change-this-in-production
```

Or set environment variables directly.

## Running the Server

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm start
```

## Endpoints

- **POST /push** - Receive notification from PHP (requires secret token)
- **GET /health** - Health check endpoint

## WebSocket Events

### Client → Server:
- `join` - Join user's notification room
  ```javascript
  socket.emit('join', { user_id: 123 });
  ```

### Server → Client:
- `notification` - New notification received
- `joined` - Confirmation of successful join
- `error` - Error message

## Security

- All HTTP requests require `X-Secret-Token` header
- Secret token must match `NOTIFICATION_SECRET` environment variable
- Update the secret token in production!


