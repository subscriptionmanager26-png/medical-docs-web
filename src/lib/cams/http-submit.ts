import { encryptRequestPayload, decryptResponseData } from "./crypto";
import { getRecaptchaToken } from "./recaptcha-browser";

const CAMS_API = "https://www.camsonline.com/api/v1/camsonline";
const REFERER =
  "https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * CAMS sends statement bounds like `01-Apr-2026` (Angular `dateformats`: DD-Mon-YYYY).
 * Calendar day is taken in **Asia/Kolkata** so it matches the live CAMS site in India.
 */
const CAMS_STATEMENT_TZ = "Asia/Kolkata";

/** `DD-Mon-YYYY` with short English month (e.g. `25-Apr-2026`) in Asia/Kolkata. */
export function camsDateFormatForCams(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMS_STATEMENT_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(d);

  const dayNum = Number(
    parts.find((p) => p.type === "day")?.value ?? "NaN",
  );
  const mon = parts.find((p) => p.type === "month")?.value ?? "Jan";
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const dd = !Number.isFinite(dayNum)
    ? "01"
    : dayNum < 10
      ? `0${dayNum}`
      : String(dayNum);
  return `${dd}-${mon}-${year}`;
}

function defaultFromDate(): Date {
  return new Date(Date.UTC(2020, 0, 1, 12, 0, 0));
}

function parseResponseCipherText(text: string): string {
  const t = text.trim();
  try {
    const j = JSON.parse(t) as { data?: string } | string;
    if (j && typeof j === "object" && typeof j.data === "string") return j.data;
    if (typeof j === "string") return j;
    return t;
  } catch {
    if (t.startsWith('"') && t.endsWith('"')) {
      try {
        return JSON.parse(t) as string;
      } catch {
        return t.slice(1, -1);
      }
    }
    return t;
  }
}

export class CamsCookieJar {
  map: Record<string, string> = {};

  applyFrom(response: Response) {
    const hdrs = response.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const list =
      typeof hdrs.getSetCookie === "function" ? hdrs.getSetCookie() : [];
    for (const line of list) {
      const pair = line.split(";")[0];
      const i = pair.indexOf("=");
      if (i > 0) {
        const k = pair.slice(0, i).trim();
        const v = pair.slice(i + 1).trim();
        this.map[k] = v;
      }
    }
  }

  header(): string {
    return Object.entries(this.map)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

function basePayload() {
  return {
    application: "CAMSONLINE",
    sub_application: "CAMSONLINE",
    browser: "Chrome",
    device_id: "131.0.0.0",
    os_id: "Windows 10",
    deviceid: "desktop",
    page_name: "/Investors/Statements/Consolidated-Account-Statement",
  };
}

async function postEncrypted(
  jar: CamsCookieJar,
  plainObject: Record<string, unknown>,
) {
  const data = encryptRequestPayload(plainObject);
  const res = await fetch(CAMS_API, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      origin: "https://www.camsonline.com",
      referer: REFERER,
      "user-agent": UA,
      ...(jar.header() ? { cookie: jar.header() } : {}),
    },
    body: JSON.stringify({ data }),
  });
  jar.applyFrom(res);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CAMS HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const cipher = parseResponseCipherText(text);
  const dec = decryptResponseData(cipher);
  return JSON.parse(dec) as Record<string, unknown>;
}

export type SubmitCamsCasOptions = {
  email: string;
  password: string;
  fromDate?: Date;
  toDate?: Date;
  statementType?: string;
  requestFlag?: string;
  zeroBalFolio?: string;
  pan?: string;
};

export type SubmitCamsCasHttpResult = {
  cams: Record<string, unknown>;
  /** Exact `from_date` / `to_date` strings (DD-Mon-YYYY) sent in the encrypted CAMS payload. */
  datesSent: { from_date: string; to_date: string };
  zeroBalFolioSent: string;
};

/**
 * HTTP-only CAS submit: session + reCAPTCHA (short browser hop) + final request.
 */
export async function submitCamsCasViaHttp(
  options: SubmitCamsCasOptions,
): Promise<SubmitCamsCasHttpResult> {
  const {
    email,
    password,
    fromDate = defaultFromDate(),
    toDate = new Date(),
    statementType = "detailed",
    requestFlag = "SP",
    /** Matches CAMS UI default in practice; `Y` = include zero-balance folios. */
    zeroBalFolio = "N",
    pan = "",
  } = options;

  const fromStr = camsDateFormatForCams(fromDate);
  const toStr = camsDateFormatForCams(toDate);

  const em = String(email).trim().toLowerCase();
  const jar = new CamsCookieJar();

  const warm = await fetch(REFERER, {
    redirect: "follow",
    headers: { "user-agent": UA },
  });
  jar.applyFrom(warm);

  const sessionPlain = {
    ...basePayload(),
    flag: "GET_ACCOUNT_STATEMENT_SESSION",
    email_id: em,
    user_id: em,
    service_code: "INVACCCAMSKARVY",
    login_type: "EMAIL",
    checkfieldtouched: "EMAIL$",
    checkfieldpristine: "EMAIL$",
  };

  const sessionRes = await postEncrypted(jar, sessionPlain);
  const status = sessionRes.status as
    | { errorflag?: boolean; errormsg?: string }
    | undefined;
  if (!status || status.errorflag) {
    throw new Error(
      `session failed: ${status?.errormsg ?? JSON.stringify(sessionRes)}`,
    );
  }
  const detail = sessionRes.detail as
    | { session_id?: string; SESSION_ID?: string }
    | undefined;
  const detail1 = sessionRes.detail1 as { session_id?: string } | undefined;
  const sessionId =
    detail?.session_id ?? detail1?.session_id ?? detail?.SESSION_ID;
  if (!sessionId) {
    throw new Error(
      `no session_id in response: ${JSON.stringify(sessionRes).slice(0, 800)}`,
    );
  }

  const recaptchaAction = "GET_ACCOUNT_STATEMENT";
  const recaptchatoken = await getRecaptchaToken(recaptchaAction);

  const submitPlain = {
    ...basePayload(),
    flag: "GET_ACCOUNT_STATEMENT",
    sub_flag: "CAMSKARVYFTAMILSBFS",
    user_id: em,
    password,
    from_date: fromStr,
    to_date: toStr,
    email_id: em,
    statement_type: statementType,
    login_type: "EMAIL",
    service_code: "INVACCCAMSKARVY",
    zero_bal_folio: zeroBalFolio,
    pan: String(pan).toUpperCase(),
    request_flag: requestFlag,
    session_id: sessionId,
    checkfieldtouched: "EMAIL$PWD$CPWD$",
    checkfieldpristine: "EMAIL$PWD$CPWD$",
    recaptchatoken,
  };

  const cams = await postEncrypted(jar, submitPlain);
  return {
    cams,
    datesSent: { from_date: fromStr, to_date: toStr },
    zeroBalFolioSent: zeroBalFolio,
  };
}
