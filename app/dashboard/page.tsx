import DashboardScreen from '@/components/dashboard/DashboardScreen';
import { AdminSessionGuard } from '@/components/auth/AdminSessionGuard';
import { requireAdministrator } from '@/lib/auth/server';

export default async function DashboardPage() {
    await requireAdministrator('/dashboard');
    return <AdminSessionGuard><DashboardScreen /></AdminSessionGuard>;
}
