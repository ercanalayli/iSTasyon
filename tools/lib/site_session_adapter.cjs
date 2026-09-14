'use strict';

const RISKY_SECRET_KEY = /password|passwd|secret|token|authorization|cookie|otp|cvv|cvc/i;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, RISKY_SECRET_KEY.test(key) && key !== 'secretsExposed' ? '[REDACTED]' : redact(item)]));
}

class SiteSessionAdapter {
  constructor(definition) {
    for (const field of ['id', 'profile', 'healthCheck', 'recover']) {
      if (!definition?.[field]) throw new Error(`site_adapter_missing_${field}`);
    }
    this.definition = Object.freeze({
      ...definition,
      escalation: Object.freeze(['captcha', 'sms', 'mfa']),
      credentialStore: 'windows_dpapi_current_user'
    });
  }

  async health(context = {}) {
    return redact(await this.definition.healthCheck(context));
  }

  async recover(context = {}) {
    const result = redact(await this.definition.recover(context));
    const reason = String(result?.reason || result?.error || '').toLowerCase();
    return { ...result, userActionRequired: /captcha|sms|mfa/.test(reason) };
  }

  describe() {
    return redact(this.definition);
  }
}

module.exports = { SiteSessionAdapter, redact };
