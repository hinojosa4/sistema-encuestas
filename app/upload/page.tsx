import UploadScreen from '@/components/upload/UploadScreen';
import { AdminSessionGuard } from '@/components/auth/AdminSessionGuard';
import { requireAdministrator } from '@/lib/auth/server';

export default async function UploadPage() {
    await requireAdministrator('/upload');
    return <AdminSessionGuard><UploadScreen /></AdminSessionGuard>;
}
