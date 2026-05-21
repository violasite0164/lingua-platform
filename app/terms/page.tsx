import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '服務條款',
  description:
    'LinguaLearn 服務條款 Terms of Service — 生效日期 2026 年 5 月 5 日，適用香港法律。',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          返回首頁
        </Link>
      </nav>

      <header className="mb-10 border-b border-border pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          服務條款 / Terms of Service
        </h1>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          生效日期：2026 年 5 月 5 日
        </p>
      </header>

      <article className="space-y-14 text-foreground">
        <section aria-labelledby="terms-en" className="space-y-6">
          <h2 id="terms-en" className="text-xl font-semibold tracking-tight md:text-2xl">
            英文版
          </h2>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h3 className="mb-2 font-medium text-foreground">1. Acceptance of Terms</h3>
              <p>
                By accessing or using our language learning platform, you agree to be bound by
                these Terms of Service. If you do not agree, please do not use the Service.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">2. User Accounts</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account and
                password. You agree to accept responsibility for all activities under your
                account.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">3. Intellectual Property</h3>
              <p>
                All content, videos, lessons, and materials on the platform are protected by
                copyright and other intellectual property laws. You may not reproduce,
                distribute, or create derivative works without permission.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">4. User Content</h3>
              <p>
                You retain ownership of your submitted assignments and recordings. By
                submitting, you grant us a worldwide, non-exclusive license to use, modify, and
                display such content for platform operation.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">5. Payment and Subscription</h3>
              <p>
                All payments are processed through Stripe. Subscriptions are auto-renewing and can
                be cancelled anytime. No refunds for partial periods unless required by law.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">6. Termination</h3>
              <p>
                We reserve the right to suspend or terminate your account for violation of these
                terms.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">7. Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by Hong Kong law, our total liability shall not
                exceed the amount paid by you in the past 12 months.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">8. Governing Law</h3>
              <p>
                These Terms shall be governed by the laws of the Hong Kong Special
                Administrative Region.
              </p>
            </section>
          </div>
        </section>

        <section aria-labelledby="terms-zh" className="space-y-6 border-t border-border pt-14">
          <h2 id="terms-zh" className="text-xl font-semibold tracking-tight md:text-2xl">
            中文版
          </h2>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            <section>
              <h3 className="mb-2 font-medium text-foreground">1. 接受條款</h3>
              <p>
                使用本語言學習平台即表示您同意受本服務條款約束。若不同意，請勿使用本服務。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">2. 用戶帳戶</h3>
              <p>
                您必須妥善保管您的帳戶及密碼，並對帳戶下所有活動負全責。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">3. 知識產權</h3>
              <p>
                平台上的所有課程、影片、教材均受版權及其他知識產權法保護，未經許可不得複製、散佈或創作衍生作品。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">4. 用戶內容</h3>
              <p>
                您對所上傳的作業及錄音擁有所有權，但授予我們全球、非獨家授權以用於平台運作。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">5. 付款與訂閱</h3>
              <p>
                所有付款透過 Stripe 處理。訂閱為自動續訂，可隨時取消。除法律規定外，不設部分期間退款。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">6. 終止服務</h3>
              <p>若您違反本條款，我們有權暫停或終止您的帳戶。</p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">7. 責任限制</h3>
              <p>
                在香港法律容許的最大範圍內，我們的總責任不會超過您過去 12 個月所支付的金額。
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-foreground">8. 管轄法律</h3>
              <p>本服務條款受香港特別行政區法律管轄。</p>
            </section>
          </div>
        </section>
      </article>
    </div>
  );
}
