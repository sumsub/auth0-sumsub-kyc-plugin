This integration enables automatic KYC (Know Your Customer) verification for your Auth0 users using Sumsub. When users log in, they will be automatically redirected to Sumsub for identity verification if they haven't completed KYC yet. Once verified, users can proceed with their login.

## Prerequisites

1. An Auth0 account and tenant. [Sign up for free](https://auth0.com/signup).
2. A Sumsub account with API access. [Sign up for Sumsub](https://cockpit.sumsub.com) and ensure you have API credentials configured.

## Set up Sumsub

To configure the integration with Sumsub:

1. Log into your [Sumsub Dashboard](https://cockpit.sumsub.com)
2. Navigate to **Settings** > **API Integration**
3. Copy the following credentials:
   - **App Token** - Your application token
   - **Secret Key** - Your secret key for signing requests
4. Configure your KYC verification level:
   - Go to **Settings** > **Levels** in your Sumsub dashboard
   - Note the **Level Name** you want to use for verification
   - This level name will be used in the integration configuration

## Add the Auth0 Action

**Note:** Once the Action is successfully deployed, all logins for your tenant will be processed by this integration. Before activating the integration in production, [install and verify this Action on a test tenant](https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments).

1. Select **Add Integration** (at the top of this page).
1. Read the necessary access requirements, and select **Continue**.
1. Configure the integration using the following fields:
   * **Sumsub App Token** (Secret) - Your Sumsub application token from the API Integration settings
   * **Sumsub Secret Key** (Secret) - Your Sumsub secret key from the API Integration settings
   * **Sumsub Level Name** (Configuration) - The KYC verification level name configured in your Sumsub account
1. Add the integration to your Library by selecting **Create**.
1. In the modal that appears, select the **Add to flow** link.
1. The Action will be automatically added to the Login flow. If you have multiple Actions and want to change the order, drag the Action to the desired location.
1. Select **Apply Changes**.

## Results

When the Action is configured and deployed:

- **First-time users**: Users logging in for the first time will be redirected to Sumsub to complete their KYC verification. After completing verification, they will be redirected back to Auth0 to complete their login.

- **Verified users**: Users who have already completed KYC verification will proceed with their login without interruption.

- **KYC status tracking**: The integration automatically tracks KYC status in user metadata and keeps it synchronized with Sumsub's API.

The following custom claims are added to the ID token and access token:

- `kyc_status` - The current KYC verification status (e.g., "completed", "pending", "init")
- `kyc_status_changed_at` - ISO timestamp of when the KYC status was last changed
- `kyc_status_expires_at` - ISO timestamp of when the KYC status expires (if applicable)

Applications can use these claims to determine whether a user has completed KYC verification and make authorization decisions accordingly.

## Troubleshooting

### Users are not being redirected to Sumsub

- Verify that all required configuration fields are set correctly
- Check that the Sumsub App Token and Secret Key are valid
- Ensure the Level Name matches exactly what is configured in your Sumsub dashboard
- Review the Action logs in Auth0 Dashboard > Monitoring > Action Logs

### KYC status is not updating

- The integration syncs with Sumsub's API on each login
- If status updates are delayed, check your Sumsub dashboard to verify the user's verification status
- Review Action logs for any API errors

### JWT token validation errors

- Ensure the Sumsub Secret Key is correct and matches your Sumsub dashboard
- Verify that the secret key hasn't been rotated in Sumsub without updating the integration

For additional support, refer to:
- [Sumsub API Documentation](https://docs.sumsub.com)
- [Auth0 Action Logs](https://auth0.com/docs/customize/actions/monitor-actions)
- [Auth0 Community](https://community.auth0.com)

