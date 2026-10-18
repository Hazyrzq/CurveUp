'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import MandorReportForm from '@/components/MandorReportForm';

export default function NewReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/mandor"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project
        </Link>
      </div>

      <DashboardHeader
        role="mandor"
        title="Submit Progress Report"
        subtitle="Report weekly actual progress for the selected RAB item."
      />

      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading form...</div>}>
        <MandorReportForm />
      </Suspense>
    </div>
  );
}
