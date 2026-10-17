import { redirect } from 'next/navigation'
import { MY_ORDERS_PATH } from '@/lib/my-orders'

export default function LegacyMyRequestsPage() {
  redirect(MY_ORDERS_PATH)
}
