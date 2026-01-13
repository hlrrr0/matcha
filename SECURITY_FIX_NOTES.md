# Security Fix: Removed Exposed API Keys

## Summary
This commit removes hardcoded API keys that were previously committed to the repository. All API keys have been replaced with environment variables.

## Changes Made

### 1. Script Files Updated
The following scripts now use environment variables instead of hardcoded API keys:
- `scripts/debug/check-companies.js`
- `scripts/utility/clear-companies.js`
- `scripts/testing/create-test-matches.js`

**Before running these scripts**, you must:
1. Create a `.env.local` file in the project root (or set environment variables)
2. Add your Firebase configuration to `.env.local`

Example:
```bash
cp .env.example .env.local
# Then edit .env.local with your actual API keys
```

### 2. Documentation Updated
Documentation files updated to use placeholder values:
- `docs/deployment/VERCEL_ENV_SETUP.md`
- `docs/deployment/VERCEL_DEPLOYMENT.md`

### 3. New Files Added
- `.env.example` - Template file with all required environment variables

## Required Actions

### For Repository Maintainers
⚠️ **CRITICAL**: The exposed API keys must be rotated immediately:

1. **Firebase API Keys**:
   - Go to Firebase Console → Project Settings
   - Navigate to your project
   - Regenerate API keys for affected projects:
     - Project: `agent-system-23630` (Key: `AIzaSyCtUxqKOhcJg6tC2ZnDTrOa0v9m0Uh7CgQ`)
     - Project: `agent-system-bc2ec` (Key: `AIzaSyBEOGEOGcMmUk8VRj70zDiGu2gqVyMZqso`)
     - Project: `agent-system-23630` (Key: `AIzaSyD6pa5Qi9vumPncVNhc3fr3IzC9TON_YsA`)
   - Update the new keys in your environment variables

2. **Review Access Logs**:
   - Check Firebase Console for any unauthorized access using the exposed keys
   - Review any suspicious activity

### For Developers
To run scripts that require Firebase access:

```bash
# 1. Copy the example environment file
cp .env.example .env.local

# 2. Edit .env.local with your Firebase credentials
nano .env.local  # or use your preferred editor

# 3. Run the script
node scripts/debug/check-companies.js
```

## Prevention
To prevent future API key leaks:

1. **Never commit `.env.local` files** - Already in `.gitignore`
2. **Use `.env.example` for templates** - Only placeholders, never real keys
3. **Use environment variables** - Always use `process.env.VARIABLE_NAME`
4. **Review before committing** - Check diffs for sensitive data
5. **Enable GitHub secret scanning** - Already enabled, as it detected this issue

## References
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
