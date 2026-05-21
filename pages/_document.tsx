/**
 * Next 在預渲染內建 `/404`、`/_error` 等路徑時仍可能走 Pages 執行緒並載入 `_document`。
 * 僅 App Router（`app/`）時若缺少此檔，`next build` 會報 Cannot find module for page: /_document。
 * 不影響 `app/layout.tsx` 對一般 App 路由的包裹。
 */
import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="zh-HK">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
