var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/actions/sumsub-api-client.js
var require_sumsub_api_client = __commonJS({
  "src/actions/sumsub-api-client.js"(exports2, module2) {
    var crypto = require("crypto");
    var SUMSUB_BASE_URL = "https://api.sumsub.com";
    var SumsubApiClient2 = class {
      constructor(config) {
        this.appToken = config.SUMSUB_APP_TOKEN;
        this.secretKey = config.SUMSUB_SECRET_KEY;
        this.baseUrl = SUMSUB_BASE_URL;
      }
      generateSignature(ts, httpMethod, endpoint, body = "") {
        const signString = ts + httpMethod + endpoint + body;
        return crypto.createHmac("sha256", this.secretKey).update(signString).digest("hex");
      }
      createHeaders(httpMethod, endpoint, body = "") {
        const ts = Math.floor(Date.now() / 1e3);
        const signature = this.generateSignature(ts, httpMethod, endpoint, body);
        return {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-App-Token": this.appToken,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts.toString()
        };
      }
      async createPermalink(payload) {
        const endpoint = "/resources/sdkIntegrations/levels/-/websdkLink";
        const httpMethod = "POST";
        const body = JSON.stringify(payload);
        const headers = this.createHeaders(httpMethod, endpoint, body);
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: httpMethod,
            headers,
            body
          });
          const responseData = await response.json();
          if (!response.ok) {
            console.error("Sumsub API error creating permalink:", {
              userId: payload.userId,
              status: response.status,
              error: responseData.description || responseData.errorName || "Unknown error",
              code: responseData.code || null
            });
            throw new Error(
              `Sumsub API error: ${responseData.description || responseData.errorName || "Unknown error"} (Code: ${responseData.code || response.status})`
            );
          }
          const permalinkId = this.extractPermalinkId(responseData.url);
          return {
            success: true,
            url: responseData.url,
            permalinkId,
            expiresAt: new Date(
              Date.now() + payload.ttlInSecs * 1e3
            ).toISOString()
          };
        } catch (error) {
          console.error("Sumsub API createPermalink failed:", {
            userId: payload.userId,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            code: error instanceof Error && "code" in error ? String(error.code) : "UNKNOWN_ERROR"
          };
        }
      }
      extractPermalinkId(url) {
        const match = url.match(/\/p\/([^\/\?]+)/);
        return match ? match[1] : null;
      }
      async getApplicantByExternalUserId(externalUserId) {
        const endpoint = `/resources/applicants/-/byExternalUserId/${encodeURIComponent(externalUserId)}`;
        const httpMethod = "GET";
        const headers = this.createHeaders(httpMethod, endpoint);
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: httpMethod,
            headers
          });
          const responseData = await response.json();
          const applicant = responseData?.applicant || responseData;
          if (!response.ok) {
            if (response.status === 404) {
              return {
                success: true,
                found: false,
                applicant: null,
                reviewStatus: null
              };
            }
            console.error("Sumsub API error getting applicant:", {
              externalUserId,
              status: response.status,
              error: responseData.description || responseData.errorName || "Unknown error",
              code: responseData.code || null
            });
            throw new Error(
              `Sumsub API error: ${responseData.description || "Unknown error"} (Code: ${response.status})`
            );
          }
          const applicantData = responseData?.applicant || responseData;
          const exists = responseData?.exists ?? true;
          const reviewStatus = applicantData?.review?.reviewStatus || null;
          return {
            success: true,
            found: exists && !!applicantData?.id,
            applicant: applicantData,
            reviewStatus
          };
        } catch (error) {
          console.error("Sumsub API getApplicantByExternalUserId failed:", {
            externalUserId,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            reviewStatus: null
          };
        }
      }
    };
    module2.exports = SumsubApiClient2;
  }
});

// src/actions/constants.js
var require_constants = __commonJS({
  "src/actions/constants.js"(exports2, module2) {
    var KYC_STATUS2 = {
      INIT: "init",
      PENDING: "pending",
      PRECHECKED: "prechecked",
      QUEUED: "queued",
      COMPLETED: "completed",
      ON_HOLD: "onHold",
      AWAITING_SERVICE: "awaitingService",
      AWAITING_USER: "awaitingUser",
      ERROR: "__error__"
      // Internal status for error cases (not a Sumsub reviewStatus)
    };
    var METADATA_KEYS = {
      KYC_STATUS: "kyc_status",
      KYC_STATUS_CHANGED_AT: "kyc_status_changed_at",
      // When status actually changed in Sumsub
      KYC_STATUS_EXPIRES_AT: "kyc_status_expires_at"
      // Expiration date from Sumsub API or JWT
    };
    var SUMSUB_FIELDS = {
      REVIEW_STATUS: "reviewStatus"
      // Single source of truth for status
    };
    var STATUS_SOURCE2 = {
      API: "api",
      METADATA: "metadata"
    };
    module2.exports = {
      KYC_STATUS: KYC_STATUS2,
      METADATA_KEYS,
      SUMSUB_FIELDS,
      STATUS_SOURCE: STATUS_SOURCE2
    };
  }
});

// src/actions/utils.js
var require_utils = __commonJS({
  "src/actions/utils.js"(exports2, module2) {
    var { METADATA_KEYS } = require_constants();
    function getKYCStatusFromMetadata2(user) {
      return user.user_metadata?.[METADATA_KEYS.KYC_STATUS] || null;
    }
    async function updateUserKYCMetadata2(api, userId, metadata) {
      try {
        if (metadata.kyc_status !== void 0) {
          api.user.setUserMetadata(METADATA_KEYS.KYC_STATUS, metadata.kyc_status);
        }
        if (metadata.kyc_status_changed_at !== void 0) {
          api.user.setUserMetadata(
            METADATA_KEYS.KYC_STATUS_CHANGED_AT,
            metadata.kyc_status_changed_at
          );
        }
        if (metadata.kyc_status_expires_at !== void 0) {
          api.user.setUserMetadata(
            METADATA_KEYS.KYC_STATUS_EXPIRES_AT,
            metadata.kyc_status_expires_at
          );
        }
        return { success: true };
      } catch (error) {
        console.error("Failed to update user KYC metadata:", {
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    function getAuth0ContinueBaseUrl(event) {
      const hostname = event?.request?.hostname;
      if (!hostname) {
        throw new Error(
          "Unable to resolve Auth0 Continue URL: missing event.request.hostname"
        );
      }
      return `https://${hostname}/continue`;
    }
    function getConfigValue(configuration, secrets, key) {
      const configValue = configuration?.[key];
      const secretValue = secrets?.[key];
      if (configValue !== void 0) {
        return { value: configValue, source: "configuration" };
      }
      if (secretValue !== void 0) {
        return { value: secretValue, source: "secrets" };
      }
      return { value: void 0, source: null };
    }
    function preparePermalinkRequestPayload2(user, secrets, configuration, event) {
      const { value: levelName } = getConfigValue(
        configuration,
        secrets,
        "SUMSUB_LEVEL_NAME"
      );
      if (!levelName) {
        throw new Error(
          "SUMSUB_LEVEL_NAME is required. Set it as a configuration parameter or secret in Auth0 Dashboard > Actions > Secrets/Configuration tab."
        );
      }
      const result = {
        userId: user.user_id,
        applicantIdentifiers: {
          email: user.email,
          phone: user.phone_number
        },
        ttlInSecs: 3600,
        levelName,
        redirect: {
          successUrl: `${getAuth0ContinueBaseUrl(event)}?status=ok`,
          rejectUrl: `${getAuth0ContinueBaseUrl(event)}?status=reject`,
          signKey: secrets.SUMSUB_SECRET_KEY,
          allowedQueryParams: ["state"]
        }
      };
      return result;
    }
    function validateSecrets2(secrets, configuration = {}) {
      const requiredKeys = [
        "SUMSUB_APP_TOKEN",
        "SUMSUB_SECRET_KEY",
        "SUMSUB_LEVEL_NAME"
      ];
      const missingKeys = requiredKeys.filter((key) => {
        const hasInSecrets = !!secrets?.[key];
        const hasInConfiguration = !!configuration?.[key];
        return !hasInSecrets && !hasInConfiguration;
      });
      if (missingKeys.length > 0) {
        const missingDetails = missingKeys.map((key) => {
          const hasInSecrets = !!secrets?.[key];
          const hasInConfiguration = !!configuration?.[key];
          return `${key} (missing in both secrets and configuration)`;
        }).join(", ");
        throw new Error(
          `Missing required parameters: ${missingKeys.join(", ")}. These must be set in either secrets or configuration in Auth0 Dashboard > Actions > Secrets/Configuration tab. Missing details: ${missingDetails}`
        );
      }
    }
    function logActionExecution2(action, user, result) {
      const logData = {
        action,
        userId: user?.user_id,
        kycStatus: getKYCStatusFromMetadata2(user),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        result: result.success ? "success" : "error",
        ...result.error && { error: result.error }
      };
      console.log("Auth0 Action Execution:", JSON.stringify(logData, null, 2));
    }
    function handleError2(error, context = "") {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.error("Auth0 Action Error:", JSON.stringify(errorInfo, null, 2));
      return {
        success: false,
        error: error.message,
        code: error instanceof Error && "code" in error ? String(error.code) : "UNKNOWN_ERROR"
      };
    }
    function extractStatusChangedAt2(apiResponse) {
      if (!apiResponse?.success || !apiResponse?.found || !apiResponse?.applicant) {
        return null;
      }
      const applicant = apiResponse.applicant;
      const reviewDate = applicant.review?.reviewDate || applicant.review?.createDate || applicant.review?.reviewResult?.reviewDate || applicant.updatedAt || null;
      if (!reviewDate) {
        return null;
      }
      try {
        const parsedDate = new Date(reviewDate);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      } catch (error) {
      }
      return null;
    }
    function extractStatusExpiresAt2(apiResponse) {
      if (!apiResponse?.success || !apiResponse?.found || !apiResponse?.applicant) {
        return null;
      }
      const applicant = apiResponse.applicant;
      const expiresAt = applicant.review?.expiresAt || applicant.review?.reviewResult?.expiresAt || applicant.review?.expiryDate || applicant.review?.reviewResult?.expiryDate || null;
      if (!expiresAt) {
        return null;
      }
      try {
        const parsedDate = new Date(expiresAt);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      } catch (error) {
      }
      return null;
    }
    function setKYCCustomClaims2(api, kycStatus, kycStatusChangedAt, kycStatusExpiresAt) {
      if (!api || !api.idToken || !api.accessToken) {
        console.error("setKYCCustomClaims - invalid API object:", {
          hasApi: !!api,
          hasIdToken: !!api?.idToken,
          hasAccessToken: !!api?.accessToken
        });
        return;
      }
      api.idToken.setCustomClaim("kyc_status", kycStatus);
      api.idToken.setCustomClaim(
        "kyc_status_changed_at",
        kycStatusChangedAt || null
      );
      api.idToken.setCustomClaim(
        "kyc_status_expires_at",
        kycStatusExpiresAt || null
      );
      api.accessToken.setCustomClaim("kyc_status", kycStatus);
      api.accessToken.setCustomClaim(
        "kyc_status_changed_at",
        kycStatusChangedAt || null
      );
      api.accessToken.setCustomClaim(
        "kyc_status_expires_at",
        kycStatusExpiresAt || null
      );
    }
    module2.exports = {
      getKYCStatusFromMetadata: getKYCStatusFromMetadata2,
      updateUserKYCMetadata: updateUserKYCMetadata2,
      extractStatusChangedAt: extractStatusChangedAt2,
      extractStatusExpiresAt: extractStatusExpiresAt2,
      preparePermalinkRequestPayload: preparePermalinkRequestPayload2,
      validateSecrets: validateSecrets2,
      logActionExecution: logActionExecution2,
      handleError: handleError2,
      getAuth0ContinueBaseUrl,
      setKYCCustomClaims: setKYCCustomClaims2
    };
  }
});

// src/actions/post-login-kyc-check.js
var jwt = require("jsonwebtoken");
var SumsubApiClient = require_sumsub_api_client();
var { KYC_STATUS, STATUS_SOURCE } = require_constants();
var {
  getKYCStatusFromMetadata,
  updateUserKYCMetadata,
  extractStatusChangedAt,
  extractStatusExpiresAt,
  preparePermalinkRequestPayload,
  validateSecrets,
  logActionExecution,
  handleError,
  setKYCCustomClaims
} = require_utils();
var onExecutePostLogin = async (event, api) => {
  try {
    const { user } = event;
    if (!event.secrets) {
      throw new Error("Secrets are required but not provided");
    }
    if (!user) {
      throw new Error("User is required");
    }
    validateSecrets(event.secrets, event.configuration);
    const metadataStatus = getKYCStatusFromMetadata(user);
    const sumsubClient = new SumsubApiClient(event.secrets);
    const apiResponse = await sumsubClient.getApplicantByExternalUserId(
      user.user_id
    );
    let currentStatus = metadataStatus;
    let statusSource = STATUS_SOURCE.METADATA;
    if (apiResponse.success) {
      if (apiResponse.found) {
        if (apiResponse.reviewStatus === null || apiResponse.reviewStatus === void 0) {
          console.warn("Sumsub API returned applicant but reviewStatus is missing - treating as API unreachable:", {
            userId: user.user_id
          });
          currentStatus = metadataStatus || null;
          statusSource = STATUS_SOURCE.METADATA;
        } else {
          currentStatus = apiResponse.reviewStatus;
          statusSource = STATUS_SOURCE.API;
          const needsMetadataUpdate = currentStatus !== metadataStatus;
          const statusChangedAt = extractStatusChangedAt(apiResponse) || user.user_metadata?.kyc_status_changed_at || null;
          const statusExpiresAt = extractStatusExpiresAt(apiResponse) || user.user_metadata?.kyc_status_expires_at || null;
          const hasNewReviewDate = statusChangedAt && statusChangedAt !== user.user_metadata?.kyc_status_changed_at;
          const hasNewExpirationDate = statusExpiresAt && statusExpiresAt !== user.user_metadata?.kyc_status_expires_at;
          if (needsMetadataUpdate || hasNewReviewDate || hasNewExpirationDate) {
            const metadataUpdate = {
              kyc_status: currentStatus,
              kyc_status_changed_at: statusChangedAt,
              kyc_status_expires_at: statusExpiresAt
            };
            const updateResult = await updateUserKYCMetadata(
              api,
              user.user_id,
              metadataUpdate
            );
            if (needsMetadataUpdate) {
              console.log("KYC status updated:", {
                userId: user.user_id,
                oldStatus: metadataStatus,
                newStatus: currentStatus,
                source: statusSource
              });
            }
            if (updateResult.error) {
              console.error("Failed to update KYC metadata:", {
                userId: user.user_id,
                error: updateResult.error
              });
            }
          } else {
            const statusChangedAtCheck = extractStatusChangedAt(apiResponse);
            const statusExpiresAtCheck = extractStatusExpiresAt(apiResponse);
            const hasNewReviewDate2 = statusChangedAtCheck && statusChangedAtCheck !== user.user_metadata?.kyc_status_changed_at;
            const hasNewExpirationDate2 = statusExpiresAtCheck && statusExpiresAtCheck !== user.user_metadata?.kyc_status_expires_at;
            if (hasNewReviewDate2 || hasNewExpirationDate2) {
              const metadataUpdate = {
                kyc_status: currentStatus,
                kyc_status_changed_at: statusChangedAtCheck || user.user_metadata?.kyc_status_changed_at || null,
                kyc_status_expires_at: statusExpiresAtCheck || user.user_metadata?.kyc_status_expires_at || null
              };
              await updateUserKYCMetadata(api, user.user_id, metadataUpdate);
            }
          }
        }
      } else {
        currentStatus = metadataStatus || null;
        statusSource = STATUS_SOURCE.METADATA;
      }
    } else {
      console.warn("Sumsub API call failed - falling back to metadata:", {
        userId: user.user_id,
        apiError: apiResponse.error
      });
      currentStatus = metadataStatus || null;
      statusSource = STATUS_SOURCE.METADATA;
    }
    if (currentStatus === "completed") {
      console.log("KYC completed - allowing login:", {
        userId: user.user_id,
        status: currentStatus,
        source: statusSource
      });
      const statusChangedAt = extractStatusChangedAt(apiResponse) || user.user_metadata?.kyc_status_changed_at || null;
      const statusExpiresAt = extractStatusExpiresAt(apiResponse) || user.user_metadata?.kyc_status_expires_at || null;
      setKYCCustomClaims(api, currentStatus, statusChangedAt, statusExpiresAt);
      logActionExecution("kyc_check", user, {
        success: true,
        action: "proceed",
        status: currentStatus,
        source: statusSource
      });
      return;
    }
    console.log("KYC not completed - redirecting to Sumsub:", {
      userId: user.user_id,
      currentStatus
    });
    const applicantData = preparePermalinkRequestPayload(
      user,
      event.secrets,
      event.configuration,
      event
    );
    const permalinkResult = await sumsubClient.createPermalink(applicantData);
    if (!permalinkResult.success) {
      console.error("Failed to create Sumsub permalink:", {
        userId: user.user_id,
        error: permalinkResult.error,
        code: permalinkResult.code || null
      });
      const errorMetadataUpdate = {
        kyc_status: KYC_STATUS.ERROR
      };
      const updateResult = await updateUserKYCMetadata(
        api,
        user.user_id,
        errorMetadataUpdate
      );
      if (updateResult.error) {
        console.error("Failed to update metadata with error status:", {
          userId: user.user_id,
          error: updateResult.error
        });
      }
      logActionExecution("kyc_check", user, {
        success: false,
        error: permalinkResult.error
      });
      return;
    }
    console.log("Redirecting user to Sumsub KYC:", {
      userId: user.user_id,
      permalinkId: permalinkResult.permalinkId
    });
    logActionExecution("kyc_check", user, {
      success: true,
      action: "redirect",
      permalinkId: permalinkResult.permalinkId,
      redirectUrl: permalinkResult.url
    });
    api.redirect.sendUserTo(permalinkResult.url);
  } catch (error) {
    console.error("KYC Check Action error:", {
      userId: event.user?.user_id || "unknown",
      error: error instanceof Error ? error.message : String(error),
      context: "post_login_kyc_check"
    });
    const errorResult = handleError(
      error instanceof Error ? error : new Error("Unknown error"),
      "post_login_kyc_check"
    );
    logActionExecution("kyc_check", event.user, errorResult);
  }
};
var onContinuePostLogin = async (event, api) => {
  try {
    const { user } = event;
    if (!user) {
      throw new Error("User is required");
    }
    const jwtToken = event.request && event.request.query ? event.request.query.jwt || event.request.query.state : void 0;
    const currentMetadataStatus = getKYCStatusFromMetadata(user);
    if (!jwtToken) {
      console.error("JWT token missing from callback:", {
        userId: user.user_id,
        availableParams: Object.keys(event.request?.query || {})
      });
      throw new Error(
        "JWT token is required but not provided in callback parameters"
      );
    }
    let decoded;
    try {
      decoded = jwt.verify(jwtToken, event.secrets.SUMSUB_SECRET_KEY, {
        algorithms: ["HS256"]
      });
    } catch (jwtError) {
      console.error("JWT verification failed:", {
        userId: user.user_id,
        error: jwtError instanceof Error ? jwtError.message : String(jwtError)
      });
      throw jwtError;
    }
    const { iat, status, exp } = decoded;
    let statusChangedAt = user.user_metadata?.kyc_status_changed_at || null;
    let statusExpiresAt = exp ? new Date(exp * 1e3).toISOString() : null;
    if (status !== void 0) {
      const statusChanged = currentMetadataStatus !== status;
      if (statusChanged) {
        try {
          const sumsubClient = new SumsubApiClient(event.secrets);
          const apiResponse = await sumsubClient.getApplicantByExternalUserId(user.user_id);
          if (apiResponse.success && apiResponse.found) {
            const extractedStatusChangedAt = extractStatusChangedAt(apiResponse);
            if (extractedStatusChangedAt) {
              statusChangedAt = extractedStatusChangedAt;
            }
          }
        } catch (error) {
          console.warn("Failed to fetch reviewDate from API in callback:", {
            userId: user.user_id,
            error: error instanceof Error ? error.message : String(error)
          });
          if (!statusChangedAt && iat) {
            statusChangedAt = new Date(iat * 1e3).toISOString();
          }
        }
      }
      const metadataUpdate = {
        kyc_status: status,
        kyc_status_changed_at: statusChangedAt,
        kyc_status_expires_at: statusExpiresAt
      };
      const updateResult = await updateUserKYCMetadata(
        api,
        user.user_id,
        metadataUpdate
      );
      if (statusChanged) {
        console.log("KYC status updated from callback:", {
          userId: user.user_id,
          oldStatus: currentMetadataStatus,
          newStatus: status
        });
      }
      if (updateResult.error) {
        console.error("Failed to update metadata from callback:", {
          userId: user.user_id,
          error: updateResult.error
        });
      }
    } else {
      console.warn("JWT token does not contain status field:", {
        userId: user.user_id,
        decodedFields: Object.keys(decoded)
      });
    }
    const kycStatus = status || getKYCStatusFromMetadata(user) || null;
    const kycStatusChangedAt = statusChangedAt || user.user_metadata?.kyc_status_changed_at || null;
    const kycStatusExpiresAt = statusExpiresAt || user.user_metadata?.kyc_status_expires_at || null;
    setKYCCustomClaims(api, kycStatus, kycStatusChangedAt, kycStatusExpiresAt);
    logActionExecution("kyc_continue", user, {
      success: true,
      action: "callback_processed",
      status,
      permalinkId: (/* @__PURE__ */ new Date()).toISOString(),
      jwtProcessed: !!jwtToken
    });
  } catch (error) {
    console.error("Continue Post-Login Action error:", {
      userId: event.user?.user_id || "unknown",
      error: error instanceof Error ? error.message : String(error),
      context: "continue_post_login_kyc"
    });
    const errorResult = handleError(
      error instanceof Error ? error : new Error("Unknown error"),
      "continue_post_login_kyc"
    );
    logActionExecution("kyc_continue", event.user, errorResult);
  }
};
module.exports = { onExecutePostLogin, onContinuePostLogin };
