import type { Metadata } from 'next';
import Link from 'next/link';

/** 私隱／支援聯絡電郵（上線時請改為實際信箱） */
const CONTACT_EMAIL = 'support@lingualearn.com';

export const metadata: Metadata = {
  title: '私隱政策',
  description:
    'LinguaLearn 私隱政策 Privacy Policy — 生效日期 2026 年 5 月 5 日，適用香港《個人資料（私隱）條例》。',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          返回首頁
        </Link>
      </nav>

      <header className="mb-10 border-b border-border pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          私隱政策 / Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          生效日期：2026 年 5 月 5 日
        </p>
      </header>

      <article className="space-y-14 text-foreground">
        <section aria-labelledby="privacy-en" className="space-y-6">
          <h2 id="privacy-en" className="text-xl font-semibold tracking-tight md:text-2xl">
            英文版
          </h2>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h3 className="mb-2 font-medium text-foreground">1. Information We Collect</h3>
              <p>
                We collect: name, email, learning progress, uploaded assignments, payment
                information (processed by Stripe), and usage data.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">2. How We Use Your Information</h3>
              <p>
                To provide and improve our services, process payments, send notifications, and
                analyze learning progress.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">3. Data Sharing</h3>
              <p className="mb-2">We do not sell your data. We may share data with:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Service providers (Stripe, Cloudflare, Supabase)</li>
                <li>Legal authorities when required by Hong Kong law</li>
              </ul>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">4. Data Storage and Security</h3>
              <p>
                Data is stored on secure servers in Hong Kong and Singapore. We use
                industry-standard security measures.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">5. Your Rights</h3>
              <p>
                Under the Personal Data (Privacy) Ordinance (Cap. 486), you have the right to
                access, correct, or request deletion of your personal data.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">6. Cookies</h3>
              <p>
                We use cookies to improve user experience. You can manage cookie preferences in
                your browser.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">7. Changes to this Policy</h3>
              <p>We may update this policy and will notify you of material changes.</p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">8. Contact Us</h3>
              <p>
                For any privacy inquiries, please contact us at{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Privacy%20inquiry`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </section>

        <section aria-labelledby="privacy-zh" className="space-y-6 border-t border-border pt-14">
          <h2 id="privacy-zh" className="text-xl font-semibold tracking-tight md:text-2xl">
            中文版
          </h2>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h3 className="mb-2 font-medium text-foreground">1. 我們收集的資料</h3>
              <p>
                我們收集：姓名、電郵、學習進度、上傳作業、付款資料（由 Stripe 處理）及使用數據。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">2. 資料使用方式</h3>
              <p>用以提供及改善服務、處理付款、發送通知及分析學習進度。</p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">3. 資料分享</h3>
              <p className="mb-2">我們不會出售您的資料。只會在以下情況分享：</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>服務供應商（Stripe、Cloudflare、Supabase）</li>
                <li>香港法律要求時提供予執法機關</li>
              </ul>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">4. 資料儲存與保安</h3>
              <p>
                資料儲存於香港及新加坡的安全伺服器，並採用業界標準保安措施。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">5. 您的權利</h3>
              <p>
                根據《個人資料（私隱）條例》（第 486 章），您有權查閱、更正或要求刪除您的個人資料。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">6. Cookies</h3>
              <p>我們使用 Cookies 提升使用體驗，您可於瀏覽器設定管理。</p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">7. 私隱政策更新</h3>
              <p>我們可能更新本政策，並會就重大變更通知您。</p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">8. 聯絡我們</h3>
              <p>
                如有私隱相關查詢，請以電郵聯絡我們：{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('私隱政策查詢')}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                。
              </p>
            </section>
          </div>
        </section>
      </article>
    </div>
  );
}
