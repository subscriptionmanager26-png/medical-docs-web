import { chromium, type Browser } from "playwright-core";

/** From CAMS Angular `commonFunctions.recaptcha` (main bundle). */
export const CAMS_RECAPTCHA_SITE_KEY =
  "6LeFNqcpAAAAAClHOnC8qbwSUtY9NFFDxYrMraWF";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Same URL as CAMS `page_name` / API referer — improves reCAPTCHA v3 context vs the homepage. */
const CAMS_RECAPTCHA_PAGE =
  "https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function launchForCams(): Promise<Browser> {
  if (process.env.VERCEL === "1") {
    /**
     * @sparticuz/chromium only inflates `al2023.tar.br` (bundled NSS/NSPR libs) and
     * prepends `/tmp/al2023/lib` to `LD_LIBRARY_PATH` when it thinks it is on
     * Lambda/Netlify (`AWS_EXECUTION_ENV` / `AWS_LAMBDA_JS_RUNTIME`). Vercel sets
     * neither, so without this the binary extracts to `/tmp/chromium` but fails
     * with: libnss3.so: cannot open shared object file.
     * @see https://github.com/Sparticuz/chromium/issues/254
     */
    process.env.AWS_LAMBDA_JS_RUNTIME ??= "nodejs22.x";

    const chromiumPack = await import("@sparticuz/chromium");
    const serverlessChromium = chromiumPack.default;
    return chromium.launch({
      args: serverlessChromium.args,
      executablePath: await serverlessChromium.executablePath(),
      /** Sparticuz uses legacy headless (`"shell"`); Playwright types only `boolean` here. */
      headless: true,
    });
  }

  const chromePath =
    process.env.CHROME_PATH ??
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined);

  if (chromePath) {
    return chromium.launch({
      executablePath: chromePath,
      headless: true,
    });
  }

  throw new Error(
    "No Chrome/Chromium for reCAPTCHA: on macOS install Google Chrome, or set CHROME_PATH to a Chromium/Chrome binary.",
  );
}

/**
 * Obtains a reCAPTCHA token like CAMS: open the real CAS route (not `/`),
 * prefer the site’s own enterprise client if present, else inject the script.
 */
export async function getRecaptchaToken(
  action = "GET_ACCOUNT_STATEMENT",
): Promise<string> {
  const browser = await launchForCams();
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1366, height: 768 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    javaScriptEnabled: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(CAMS_RECAPTCHA_PAGE, {
      waitUntil: "load",
      timeout: 90000,
    });
    /** Let Angular / reCAPTCHA bootstrap; very fast execute tends to score 0. */
    await sleep(1500);

    const token = await page.evaluate(
      async ({
        siteKey,
        action: act,
      }: {
        siteKey: string;
        action: string;
      }) => {
        const load = (src: string) =>
          new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error(`script load failed: ${src}`));
            document.head.appendChild(s);
          });

        type Ent = {
          ready: (cb: () => void) => void;
          execute: (k: string, o: { action: string }) => Promise<string>;
        };
        const g = (
          globalThis as unknown as {
            grecaptcha?: { enterprise?: Ent };
          }
        ).grecaptcha;

        const executeEnterprise = async (ent: Ent) => {
          await new Promise<void>((r) => {
            ent.ready(r);
          });
          return ent.execute(siteKey, { action: act });
        };

        /** Prefer script already loaded by camsonline.com (same as a real user). */
        if (g?.enterprise) {
          return executeEnterprise(g.enterprise);
        }

        const tryEnterprise = async () => {
          await load(
            `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`,
          );
          const g2 = (
            globalThis as unknown as { grecaptcha?: { enterprise?: Ent } }
          ).grecaptcha;
          if (!g2?.enterprise) throw new Error("enterprise not available");
          return executeEnterprise(g2.enterprise);
        };

        const tryStandard = async () => {
          await load(
            `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
          );
          const g3 = (
            globalThis as unknown as {
              grecaptcha?: {
                ready: (cb: () => void) => void;
                execute: (k: string, o: { action: string }) => Promise<string>;
              };
            }
          ).grecaptcha;
          if (!g3) throw new Error("grecaptcha not available");
          await new Promise<void>((r) => {
            g3.ready(r);
          });
          return g3.execute(siteKey, { action: act });
        };

        try {
          return await tryEnterprise();
        } catch {
          return await tryStandard();
        }
      },
      { siteKey: CAMS_RECAPTCHA_SITE_KEY, action },
    );

    if (!token || typeof token !== "string") {
      throw new Error("empty recaptcha token");
    }
    return token;
  } finally {
    await context.close();
    await browser.close();
  }
}
