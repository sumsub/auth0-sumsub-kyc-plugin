# Sumsub KYC Integration for Auth0

An [Auth0 post-login Action](https://auth0.com/docs/customize/actions) that adds
[Sumsub](https://sumsub.com) identity verification (KYC) to your Auth0 login flow. After a user
signs in, the Action redirects them to Sumsub for verification and stores the result in their
Auth0 user metadata.

This repository contains the released build of the integration:

| File | Purpose |
|------|---------|
| `build/post-login-kyc-check.js` | The Action code to deploy to your Auth0 tenant |
| `build/configuration.json` | Secrets and configuration the Action requires |
| `build/installation_guide.md` | Step-by-step installation instructions |

## Installation

Follow [`build/installation_guide.md`](build/installation_guide.md). In short: create a post-login
Action in your Auth0 tenant from `build/post-login-kyc-check.js`, then set the secrets and
configuration values listed in `build/configuration.json` (Sumsub app token, secret key, and
verification level name from your [Sumsub dashboard](https://cockpit.sumsub.com)).

## Support

- Sumsub documentation: https://docs.sumsub.com
- Sumsub support: support@sumsub.com

## License

See [LICENSE](LICENSE).
