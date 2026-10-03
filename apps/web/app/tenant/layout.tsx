import { requireTenant } from '@/lib/auth';

export default async function TenantRoot({ children }: { children: React.ReactNode }) {
  await requireTenant({ allowWithoutConsent: true });
  return children;
}
