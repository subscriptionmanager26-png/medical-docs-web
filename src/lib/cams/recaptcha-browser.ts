import { chromium, type Browser } from "playwright-core";

/** From CAMS Angular `commonFunctions.recaptcha` (main bundle). */
export const CAMS_RECAPTCHA_SITE_KEY =
  "6LeFNqcpAAAAAClHOnC8qbwSUtY9NFFDxYrMraWF";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
 * Obtains a reCAPTCHA token the same way CAMS does: load Google script on
 * www.camsonline.com, then enterprise.execute(siteKey, { action }).
 */
export async function getRecaptchaToken(
  action = "GET_ACCOUNT_STATEMENT",
): Promise<string> {
  const browser = await launchForCams();
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto("https://www.camsonline.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

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

        const tryEnterprise = async () => {
          await load(
            `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`,
          );
          const g = (
            globalThis as unknown as {
              grecaptcha?: {
                enterprise?: {
                  ready: (cb: () => void) => void;
                  execute: (k: string, o: { action: string }) => Promise<string>;
                };
              };
            }
          ).grecaptcha;
          if (!g?.enterprise) throw new Error("enterprise not available");
          await new Promise<void>((r) => {
            g.enterprise!.ready(r);
          });
          return g.enterprise!.execute(siteKey, { action: act });
        };

        const tryStandard = async () => {
          await load(
            `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
          );
          const g = (
            globalThis as unknown as {
              grecaptcha?: {
                ready: (cb: () => void) => void;
                execute: (k: string, o: { action: string }) => Promise<string>;
              };
            }
          ).grecaptcha;
          if (!g) throw new Error("grecaptcha not available");
          await new Promise<void>((r) => {
            g.ready(r);
          });
          return g.execute(siteKey, { action: act });
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
    await browser.close();
  }
}
