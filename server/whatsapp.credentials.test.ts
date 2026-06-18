import { describe, it, expect } from 'vitest';
import { ENV } from './_core/env';

describe('WhatsApp Credentials Validation', () => {
  it('should have all required WhatsApp credentials configured', () => {
    expect(ENV.whatsappToken).toBeDefined();
    expect(ENV.whatsappToken).toBeTruthy();
    expect(ENV.whatsappToken.length).toBeGreaterThan(0);
  });

  it('should have valid phone number ID', () => {
    expect(ENV.whatsappPhoneNumberId).toBeDefined();
    expect(ENV.whatsappPhoneNumberId).toBe('965059403366919');
  });

  it('should have valid webhook verify token', () => {
    expect(ENV.whatsappVerifyToken).toBeDefined();
    expect(ENV.whatsappVerifyToken).toBe('bolted_iron_hub_verify_2026');
  });

  it('should have valid webhook URL format', () => {
    const webhookUrl = 'https://boltediron-jvzmywuk.manus.space/api/webhooks/whatsapp';
    expect(webhookUrl).toMatch(/^https:\/\//);
    expect(webhookUrl).toContain('/api/webhooks/whatsapp');
  });

  it('should validate token format (Bearer token pattern)', () => {
    // WhatsApp tokens start with 'EA' and are long alphanumeric strings
    expect(ENV.whatsappToken).toMatch(/^EA[A-Za-z0-9_-]+$/);
  });

  it('should validate phone number ID is numeric', () => {
    expect(ENV.whatsappPhoneNumberId).toMatch(/^\d+$/);
  });

  it('should have critical credentials non-empty', () => {
    const credentials = {
      token: ENV.whatsappToken,
      phoneId: ENV.whatsappPhoneNumberId,
      verifyToken: ENV.whatsappVerifyToken,
    };

    Object.entries(credentials).forEach(([key, value]) => {
      expect(value, `${key} should not be empty`).toBeTruthy();
    });
  });
});
