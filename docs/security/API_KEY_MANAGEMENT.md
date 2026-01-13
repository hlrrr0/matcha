# API Key Security Management

## ⚠️ Important Security Notice

This document provides guidelines for managing API keys and sensitive credentials in the RecruitPro system.

## 🔒 API Key Management

### 1. Environment Variables

All API keys and sensitive credentials **MUST** be stored in environment variables and **NEVER** committed to the repository.

#### Local Development
Create a `.env.local` file in the root directory (this file is gitignored):

```bash
cp .env.example .env.local
```

Then fill in your actual API keys in `.env.local`.

#### Production/Staging
Configure environment variables in your deployment platform (e.g., Vercel, AWS, etc.).

### 2. Required API Keys

#### Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase Web API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Firebase analytics measurement ID

**Where to get**: Firebase Console > Project Settings > General > Your apps > Firebase SDK snippet

#### Google Maps API Keys
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Client-side Maps API key (with HTTP referrer restrictions)
- `GOOGLE_MAPS_SERVER_API_KEY` - Server-side Geocoding API key (with IP address restrictions)

**Where to get**: Google Cloud Console > APIs & Services > Credentials

**Security settings**:
- Client key: Restrict to your domain(s) using HTTP referrer restrictions
- Server key: Restrict to your server IP addresses

#### Domino System Integration
- `NEXT_PUBLIC_DOMINO_API_URL` - Domino API base URL
- `NEXT_PUBLIC_DOMINO_API_KEY` - Domino API authentication key

**Where to get**: Contact your Domino system administrator

### 3. Running Scripts with Environment Variables

Scripts in the `scripts/` directory require Firebase credentials. Make sure you have `.env.local` configured:

```bash
# Check companies
node scripts/debug/check-companies.js

# Clear companies (be careful!)
node scripts/utility/clear-companies.js

# Create test matches
node --loader ts-node/esm scripts/testing/create-test-matches.js

# Bulk geocode stores
node bulk-geocode-stores.js
```

### 4. API Key Rotation

If an API key is exposed or compromised:

1. **Immediately revoke the exposed key** in the respective console (Firebase, Google Cloud, etc.)
2. **Generate a new key** with appropriate restrictions
3. **Update all environments** where the key is used:
   - Local `.env.local` files (notify team members)
   - Staging environment variables
   - Production environment variables
4. **Test thoroughly** to ensure the new key works correctly
5. **Document the rotation** in your security logs

### 5. Security Best Practices

#### DO ✅
- Store all API keys in environment variables
- Use different API keys for development, staging, and production
- Apply API key restrictions (HTTP referrers, IP addresses, API restrictions)
- Rotate API keys regularly (at least annually)
- Monitor API key usage for suspicious activity
- Use `.env.local` for local development (it's gitignored)
- Review the `.gitignore` file to ensure sensitive files are excluded

#### DON'T ❌
- Never commit API keys to version control
- Never share API keys in chat, email, or documentation
- Never use production API keys in development
- Never disable API key restrictions "temporarily"
- Never store API keys in client-side code without proper restrictions

### 6. Emergency Response

If you discover an exposed API key in the repository:

1. **Immediately notify the security team**
2. **Revoke the exposed key** in the relevant console
3. **Generate and deploy new keys** across all environments
4. **Remove the key from git history** (contact DevOps team)
5. **Review access logs** for potential unauthorized usage
6. **Document the incident** for future prevention

## 📚 Additional Resources

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Google Cloud API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

## 🔍 Checking for Exposed Keys

Before committing code, always check for accidentally included keys:

```bash
# Search for potential API keys in your changes
git diff | grep -i "api[_-]key"
git diff | grep -E "AIza[0-9A-Za-z_-]{35}"

# Use git-secrets or similar tools to prevent commits with secrets
# https://github.com/awslabs/git-secrets
```

## ✉️ Contact

For security concerns or questions about API key management, contact:
- Security Team: security@yourcompany.com
- DevOps Team: devops@yourcompany.com
