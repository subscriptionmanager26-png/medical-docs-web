import CryptoJS from "crypto-js";
import { createHash } from "node:crypto";

const SEED_ENCRYPT = "TkVJTEhobWFj";
const SEED_DECRYPT = "UkRYTElobWFj";
const IV = CryptoJS.enc.Utf8.parse("globalaesvectors");

function aesKey(seed: string) {
  const hs = createHash("sha256").update(seed).digest("hex");
  const hbs = hs.substring(0, 32);
  return CryptoJS.enc.Utf8.parse(hbs);
}

export function encryptRequestPayload(plainObject: unknown): string {
  const plain =
    typeof plainObject === "string"
      ? plainObject
      : JSON.stringify(plainObject);
  const key = aesKey(SEED_ENCRYPT);
  const enc = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plain), key, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const out = enc.ciphertext.toString(CryptoJS.enc.Base64);
  return out.split("+").join("-").split("/").join("_");
}

export function decryptResponseData(b64url: string): string {
  const key = aesKey(SEED_DECRYPT);
  const y = b64url.split("-").join("+").split("_").join("/");
  const cp = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(y),
  });
  const dec = CryptoJS.AES.decrypt(cp, key, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return dec.toString(CryptoJS.enc.Utf8);
}
