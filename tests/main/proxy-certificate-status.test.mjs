import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { linuxCaBundleContainsCertificateFingerprint } from "../../src/server/proxy/service.ts";

const ccrCaPem = `-----BEGIN CERTIFICATE-----
MIIDizCCAnOgAwIBAgIUb7eYCNh3dJBSBvO6+1HCqQBLtR0wDQYJKoZIhvcNAQEL
BQAwVTELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAoM
DUNsYXVkZSBDb2RlIFJvdXRlcjEZMBcGA1UEAwwQQ0NSIFRlc3QgUm9vdCBDQTAe
Fw0yNjAxMDEwMDAwMDBaFw0zNjAxMDEwMDAwMDBaMFUxCzAJBgNVBAYTAlVTMRMw
EQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQKDA1DbGF1ZGUgQ29kZSBSb3V0ZXIx
GTAXBgNVBAMMEENDUiBUZXN0IFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQDN3X4P6uM5KxL6Po7AtyMQr80zsQhmHzliJrrINeVij5D+fkH6
QZ9PrNuj8o7Z5y2Lm1U9zPRWObLi15CgIjKtjOxPL2sGOMvAyXH4bnh0XRdKwYP6
bniX9S9oJ0aU4vxMcT4h7R91sOuc4ga7XHeFDI9DF8kp9YlgLkAKW+0yQwKgtgEY
0QwCmBCy4D2pC5l7gsTA37mU7/JV5uQbDJP+iUhfiKpWEULMXfVaKM97MoTcXuW8
pKxRHAE0y4A1Cj/ti7moHfvVfT3V6y8FEp9WVkf+JkK5K7J7B5GLDAAXcJOUcY5Y
8ZRgHoDB+teZAGXsxWKe8fOYeSflAgMBAAGjUzBRMB0GA1UdDgQWBBRfNW0GVOac
lCQ90gP7/Kr4vqkUWzAfBgNVHSMEGDAWgBRfNW0GVOaclCQ90gP7/Kr4vqkUWzAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAYf26FXlpfRPMLgy7u
XCK4N4be9HIbhvtdkb4tiHVAX9XsvOXsWk8ed2kSH1C8+oiGPiwLnGRdEsPz9adg
tHVMrmszeLlDzUjIAwJc9/MsZn6E90ERLcqOmeo/N2Vu9+sMLDsgLWOfVGd7j3C8
ISFtUgaWgiQzJHsw3bBDkm7clwcyR2f80soOt4yjRxvKYfW+d+AjOoTzc4WdDKSC
x3i7j2Z0FZTgUQ/uHUbm6uGRq4F1AvCqykS3Ihwx4GJSLqxAVJ1+mfQT2Y0CKOwr
8Qu/xl7LGyAtSu7s/lx94sAkK4KwMI6OfmRPbK23pM6S7Q7gA6ngRX3ipCgJ
-----END CERTIFICATE-----`;

function fingerprintSha256(pem) {
  const der = Buffer.from(
    pem
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s+/g, ""),
    "base64"
  );
  return createHash("sha256").update(der).digest("hex").match(/.{1,2}/g).join(":").toUpperCase();
}

test("linux CA bundle detection matches a certificate fingerprint in bundle text", () => {
  const bundle = [
    "-----BEGIN CERTIFICATE-----",
    "MIIBszCCAVmgAwIBAgIUbm90LXRoZS1jZXJ0",
    "-----END CERTIFICATE-----",
    ccrCaPem
  ].join("\n");

  assert.equal(linuxCaBundleContainsCertificateFingerprint(bundle, fingerprintSha256(ccrCaPem)), true);
  assert.equal(linuxCaBundleContainsCertificateFingerprint(bundle, "00:11:22:33"), false);
});
