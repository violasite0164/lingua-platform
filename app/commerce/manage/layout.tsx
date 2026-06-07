import { CommerceManageNav } from '@/components/commerce/commerce-manage-nav';
import { requireCommerceAccess } from '@/lib/commerce/auth';

export const metadata = {
  title: '商家後台',
};

export default async function CommerceManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCommerceAccess('/commerce/manage');

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full bg-background text-foreground">
      <CommerceManageNav variant="sidebar" />
      <div className="flex min-w-0 flex-1 flex-col bg-muted/30">
        <CommerceManageNav variant="mobile" />
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
