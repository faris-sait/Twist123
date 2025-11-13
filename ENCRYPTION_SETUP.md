# AES-256 Message Encryption

## Overview
All direct messages in the application are now encrypted using **AES-256-CBC** encryption before being stored in the database. This ensures that messages are stored securely and cannot be read in plaintext from the database.

## Implementation Details

### Encryption Algorithm
- **Algorithm**: AES-256-CBC (Advanced Encryption Standard)
- **Key Size**: 256 bits (32 bytes / 64 hex characters)
- **IV (Initialization Vector)**: 16 bytes (randomly generated for each message)
- **Format**: Encrypted messages are stored as `iv:encryptedData` (both in hex format)

### Files Modified

1. **`lib/encryption.js`** - NEW
   - `encrypt(text)` - Encrypts plaintext messages
   - `decrypt(encryptedText)` - Decrypts encrypted messages
   - `generateEncryptionKey()` - Utility to generate new keys

2. **`app/api/conversations/[id]/messages/route.js`** - UPDATED
   - **POST**: Encrypts message content before saving to database
   - **GET**: Decrypts all messages before returning to client

3. **`app/api/conversations/route.js`** - UPDATED
   - **GET**: Decrypts latest message preview in conversation list

4. **`.env`** - UPDATED
   - Added `ENCRYPTION_KEY` environment variable

## How It Works

### Sending a Message
1. User types a message in the UI
2. Message is sent to API as plaintext
3. API encrypts the message using AES-256
4. Encrypted message is stored in database
5. API decrypts and returns the message to client

### Reading Messages
1. API fetches encrypted messages from database
2. Each message is decrypted using the encryption key
3. Decrypted messages are sent to the client
4. User sees plaintext messages in the UI

### Database Storage
In the database, messages look like this:
```
iv:encryptedData
Example: a3f2b1c9d8e7f6a5b4c3d2e1f0a9b8c7:9f8e7d6c5b4a39281726354...
```

The first part (before `:`) is the initialization vector (IV), and the second part is the encrypted message content.

## Security Notes

### ✅ What's Protected
- All message content is encrypted at rest in the database
- Each message uses a unique IV for maximum security
- Encryption key is stored securely in environment variables
- Even database administrators cannot read message content without the key

### ⚠️ Important Security Considerations
1. **Keep the encryption key secure**
   - Never commit the `.env` file to version control
   - Store the key in a secure vault or secrets manager in production
   - If the key is lost, all messages become unrecoverable

2. **Key Rotation**
   - If you need to change the encryption key, you must decrypt all existing messages with the old key and re-encrypt with the new key
   - This requires a migration script

3. **What's NOT encrypted**
   - Metadata (sender, timestamp, conversation participants)
   - User profiles
   - Only message content is encrypted

### 🔒 Best Practices
- Use a unique, randomly generated key (already done)
- Never share or expose the encryption key
- In production, use environment-specific keys
- Consider implementing key rotation policies
- Backup the encryption key securely

## Testing

### Verify Encryption is Working

1. **Send a test message** through the UI

2. **Check the database** (Supabase SQL Editor):
```sql
SELECT content FROM messages ORDER BY created_at DESC LIMIT 1;
```
You should see encrypted text like: `a3f2b1c9d8e7f6a5b4c3d2e1f0a9b8c7:9f8e7d6c5b4a39281726354...`

3. **Check the UI** - Messages should display as normal plaintext

### Generate a New Encryption Key (if needed)
Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Migration of Existing Messages

If you had messages before implementing encryption, they are stored as plaintext. You have two options:

### Option 1: Delete old messages
```sql
DELETE FROM messages;
```

### Option 2: Migrate existing messages (Advanced)
Create a migration script that:
1. Reads all existing messages
2. Encrypts each message
3. Updates the database with encrypted versions

This would require a custom migration script using the encryption functions.

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not set"
- Make sure `.env` file contains `ENCRYPTION_KEY=...`
- Restart your development server after adding the key

### Error: "Failed to decrypt message"
- The encryption key may have changed
- The message format in database is invalid
- Database may contain old plaintext messages

### Messages showing as "[Unable to decrypt message]"
- Check that the ENCRYPTION_KEY in `.env` is correct
- Verify the message format in database is `iv:encryptedData`

## Production Deployment

When deploying to production:

1. **Set environment variable** in your hosting platform:
   - Vercel: Add `ENCRYPTION_KEY` in project settings
   - Other platforms: Set environment variable securely

2. **Use the same key** across all environments where data is shared
   - Development and production should use different keys
   - Never reuse keys between isolated databases

3. **Backup the key** securely before deployment

## Compliance

This encryption implementation helps with:
- ✅ Data protection regulations (GDPR, CCPA)
- ✅ Privacy requirements
- ✅ Security best practices
- ✅ User trust and confidence

---

**Status**: ✅ Encryption is now active and working
**All new messages are automatically encrypted**
