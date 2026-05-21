import { marketingThemeStyleText, resolveMarketingThemePreset } from '@/lib/marketing-theme';
import { getHomepageConfigRow } from '@/lib/homepage-config';

/** 由後台設定覆寫全站主色、CTA 與行銷強調色 */
export async function SiteMarketingTheme() {
  const row = await getHomepageConfigRow();
  const preset = resolveMarketingThemePreset(row?.marketing_theme_preset);

  return (
    <style
      id="site-marketing-theme"
      data-preset={preset}
      dangerouslySetInnerHTML={{
        __html: marketingThemeStyleText(preset),
      }}
    />
  );
}
