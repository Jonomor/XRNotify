import { NextRequest, NextResponse } from 'next/server';
import { createModuleLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('csp-violation');

interface CspReport {
  'csp-report'?: {
    'violated-directive'?: string;
    'blocked-uri'?: string;
    'document-uri'?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CspReport;
    const report = body['csp-report'] ?? {};

    logger.warn(
      {
        violatedDirective: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        documentUri: report['document-uri'],
      },
      'CSP violation reported'
    );
  } catch (err) {
    logger.warn({ err }, 'Failed to parse CSP report');
  }

  return new NextResponse(null, { status: 204 });
}
