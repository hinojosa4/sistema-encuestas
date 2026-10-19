import { parseReportParameters } from '@/lib/reports';
import { generateReport } from '@/lib/reportService';
import { databaseMessage } from '@/lib/surveyRepository';
import { serverSupabase } from '@/lib/auth/server';
import { inspectAdminAccess } from '@/lib/auth/access';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: Request) {
    try {
        const client = await serverSupabase();
        const access = await inspectAdminAccess(client);
        if (access.status !== 'admin') {
            const status = access.status === 'anonymous' ? 401 : access.status === 'forbidden' ? 403 : 503;
            return Response.json({ error: status === 401 ? 'Inicia sesión para generar reportes.' : status === 403 ? 'Esta cuenta no tiene permiso de administración.' : 'No se pudo verificar el acceso de administración.' }, { status, headers });
        }
        let params;
        try { params = parseReportParameters(new URL(request.url).searchParams); }
        catch { return Response.json({ error: 'Selecciona una población válida y un corte entero entre 0 y 30 años.' }, { status: 400, headers }); }
        return Response.json(await generateReport(client, params), { headers });
    } catch (error) {
        return Response.json({ error: databaseMessage(error) }, { status: 503, headers });
    }
}
