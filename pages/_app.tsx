/**
 * 與 `_document.tsx` 成對，供 Next 內建 Pages 後備路由（如錯誤頁編譯）使用。
 * App Router 頁面仍由 `app/layout.tsx` 負責。
 */
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
