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
          href="/dashboard/foreman"
          className="btn-secondary w-fit px-3.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project
        </Link>
      </div>

      <DashboardHeader
        role="mandor"
        title="Submit Progress Report"
      />

      <Suspense fallback={<div className="p-8 text-center text-xs text-ink-secondary">Loading form...</div>}>
        <MandorReportForm />
      </Suspense>
    </div>
  );
}
