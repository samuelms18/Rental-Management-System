import type { NavItem } from '@/components/nav-links';

/** A titled menu group (label = i18n key under "navGroups"). */
export type NavGroup = { label: string; items: NavItem[] };

export const OWNER_PRIMARY: NavItem[] = [
  { href: '/owner', label: 'dashboard', icon: 'home', exact: true },
  { href: '/owner/rent', label: 'rent', icon: 'rupee' },
  { href: '/owner/payments', label: 'payments', icon: 'check' },
  { href: '/owner/complaints', label: 'complaints', icon: 'wrench' },
  { href: '/owner/more', label: 'more', icon: 'more', mobileOnly: true, badge: 'unread' },
];

export const OWNER_GROUPS: NavGroup[] = [
  {
    label: 'masters',
    items: [
      { href: '/owner/properties', label: 'properties', icon: 'building' },
      { href: '/owner/tenants', label: 'tenants', icon: 'users' },
      { href: '/owner/team', label: 'team', icon: 'shield' },
    ],
  },
  {
    label: 'money',
    items: [
      { href: '/owner/eb', label: 'eb', icon: 'zap' },
      { href: '/owner/expenses', label: 'expenses', icon: 'receipt' },
      { href: '/owner/reminders', label: 'reminders', icon: 'message' },
    ],
  },
  {
    label: 'operations',
    items: [
      { href: '/owner/agreements', label: 'agreements', icon: 'file' },
      { href: '/owner/guests', label: 'guests', icon: 'users' },
      { href: '/owner/announcements', label: 'announcements', icon: 'bell' },
    ],
  },
  {
    label: 'insights',
    items: [
      { href: '/owner/reports', label: 'reports', icon: 'list' },
      { href: '/owner/activity', label: 'activity', icon: 'list' },
      { href: '/owner/search', label: 'search', icon: 'search' },
    ],
  },
  {
    label: 'account',
    items: [
      { href: '/owner/notifications', label: 'notifications', icon: 'bell', badge: 'unread' },
      { href: '/owner/profile', label: 'profile', icon: 'user' },
    ],
  },
];

export const TENANT_PRIMARY: NavItem[] = [
  { href: '/tenant', label: 'home', icon: 'home', exact: true },
  { href: '/tenant/rent', label: 'rent', icon: 'rupee' },
  { href: '/tenant/complaints', label: 'complaints', icon: 'wrench' },
  { href: '/tenant/notifications', label: 'notifications', icon: 'bell', badge: 'unread' },
  { href: '/tenant/more', label: 'more', icon: 'more', mobileOnly: true },
];

export const TENANT_GROUPS: NavGroup[] = [
  {
    label: 'myHome',
    items: [
      { href: '/tenant/house', label: 'myHouse', icon: 'building' },
      { href: '/tenant/agreement', label: 'agreement', icon: 'file' },
      { href: '/tenant/occupants', label: 'occupants', icon: 'users' },
      { href: '/tenant/documents', label: 'documents', icon: 'shield' },
    ],
  },
  {
    label: 'money',
    items: [
      { href: '/tenant/payments', label: 'paymentHistory', icon: 'card' },
      { href: '/tenant/eb', label: 'eb', icon: 'zap' },
      { href: '/tenant/settlement', label: 'settlement', icon: 'receipt' },
    ],
  },
  {
    label: 'community',
    items: [
      { href: '/tenant/guests', label: 'guests', icon: 'users' },
      { href: '/tenant/help', label: 'domesticHelp', icon: 'users' },
      { href: '/tenant/announcements', label: 'announcements', icon: 'bell' },
    ],
  },
  {
    label: 'account',
    items: [{ href: '/tenant/profile', label: 'profile', icon: 'user' }],
  },
];
