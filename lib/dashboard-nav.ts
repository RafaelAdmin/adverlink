import { MY_ORDERS_LABEL, MY_ORDERS_PATH } from '@/lib/my-orders'

export type DashboardNavItem = {
  icon: string
  label: string
  href: string
  key: string
}

export function getDashboardNavItems(role: 'creator' | 'advertiser'): DashboardNavItem[] {
  const orders: DashboardNavItem = {
    icon: 'ti-clipboard-list',
    label: MY_ORDERS_LABEL,
    href: MY_ORDERS_PATH,
    key: 'orders',
  }

  if (role === 'creator') {
    return [
      { icon: 'ti-brand-telegram', label: 'Мои каналы', href: '/dashboard', key: 'home' },
      orders,
      { icon: 'ti-shopping-bag', label: 'Маркетплейс', href: '/dashboard/marketplace', key: 'marketplace' },
      { icon: 'ti-chart-line', label: 'Статистика', href: '/dashboard/statistics', key: 'statistics' },
      { icon: 'ti-star', label: 'Отзывы', href: '/dashboard/reviews', key: 'reviews' },
      { icon: 'ti-users', label: 'Друзья', href: '/dashboard/friends', key: 'friends' },
      { icon: 'ti-diamond', label: 'Подписки', href: '/dashboard/subscriptions', key: 'subscriptions' },
      { icon: 'ti-settings', label: 'Настройки', href: '/dashboard/settings', key: 'settings' },
    ]
  }

  return [
    { icon: 'ti-layout-dashboard', label: 'Мои кампании', href: '/dashboard', key: 'home' },
    orders,
    { icon: 'ti-shopping-bag', label: 'Маркетплейс', href: '/dashboard/marketplace', key: 'marketplace' },
    { icon: 'ti-chart-line', label: 'Статистика', href: '/dashboard/statistics', key: 'statistics' },
    { icon: 'ti-star', label: 'Отзывы', href: '/dashboard/reviews', key: 'reviews' },
    { icon: 'ti-users', label: 'Друзья', href: '/dashboard/friends', key: 'friends' },
    { icon: 'ti-diamond', label: 'Подписки', href: '/dashboard/subscriptions', key: 'subscriptions' },
    { icon: 'ti-settings', label: 'Настройки', href: '/dashboard/settings', key: 'settings' },
  ]
}

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}
