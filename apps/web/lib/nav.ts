import type { NavItem } from '@/components/nav-links';

export const OWNER_PRIMARY: NavItem[] = [
  { href: '/owner', label: 'dashboard', icon: 'home', exact: true },
  { href: '/owner/rent', label: 'rent', icon: 'rupee' },
  { href: '/owner/payments', label: 'payments', icon: 'check' },
  { href: '/owner/complaints', label: 'complaints', icon: 'wrench' },
  { href: '/owner/more', label: 'more', icon: 'more', mobileOnly: true, badge: 'unread' },
];

export const OWNER_SECONDARY: NavItem[] = [
  { href: '/owner/properties', label: 'properties', icon: 'building' },
  { href: '/owner/tenants', label: 'tenants', icon: 'users' },
  { href: '/owner/agreements', label: 'agreements', icon: 'file' },
  { href: '/owner/eb', label: 'eb', icon: 'zap' },
  { href: '/owner/reminders', label: 'reminders', icon: 'message' },
  { href: '/owner/expenses', label: 'expenses', icon: 'receipt' },
  { href: '/owner/activity', label: 'activity', icon: 'list' },
  { href: '/owner/search', label: 'search', icon: 'search' },
  { href: '/owner/notifications', label: 'notifications', icon: 'bell', badge: 'unread' },
  { href: '/owner/profile', label: 'profile', icon: 'user' },
];

export const TENANT_PRIMARY: NavItem[] = [
  { href: '/tenant', label: 'home', icon: 'home', exact: true },
  { href: '/tenant/rent', label: 'rent', icon: 'rupee' },
  { href: '/tenant/complaints', label: 'complaints', icon: 'wrench' },
  { href: '/tenant/notifications', label: 'notifications', icon: 'bell', badge: 'unread' },
  { href: '/tenant/more', label: 'more', icon: 'more', mobileOnly: true },
];

export const TENANT_SECONDARY: NavItem[] = [
  { href: '/tenant/house', label: 'myHouse', icon: 'building' },
  { href: '/tenant/agreement', label: 'agreement', icon: 'file' },
  { href: '/tenant/payments', label: 'paymentHistory', icon: 'card' },
  { href: '/tenant/eb', label: 'eb', icon: 'zap' },
  { href: '/tenant/occupants', label: 'occupants', icon: 'users' },
  { href: '/tenant/documents', label: 'documents', icon: 'shield' },
  { href: '/tenant/profile', label: 'profile', icon: 'user' },
];
