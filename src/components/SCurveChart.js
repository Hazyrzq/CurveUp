'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { tokens as t, alpha } from '../../design-tokens';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SCurveChart({
  dataRencana,
  dataRealisasi,
  labels,
  reports = [],
  selectedWeek = null,
  onWeekSelect,
}) {
  const chartLabels = labels || [];
  const rencana = dataRencana || [];
  const realisasi = dataRealisasi || [];
  const hasData = chartLabels.length > 0 && (rencana.length > 0 || realisasi.length > 0);

  if (!hasData) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center text-sm text-ink-secondary">
        <div className="flex items-end justify-center gap-2 h-24 mb-4 opacity-40">
          <div className="w-6 bg-line rounded-t h-[30%]" />
          <div className="w-6 bg-navy-300 rounded-t h-[55%]" />
          <div className="w-6 bg-orange-500 rounded-t h-[80%]" />
          <div className="w-6 bg-navy-800 rounded-t h-[45%]" />
        </div>
        No S-curve data available yet
      </div>
    );
  }

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Planned',
        data: rencana,
        // Planned: navy dashed line, no fill
        borderColor: t.navy[800],
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 5],
        tension: 0.35,
        fill: false,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 6 : 2.5),
        pointHoverRadius: 6,
        pointBackgroundColor: t.surface,
        pointBorderColor: t.navy[800],
        pointBorderWidth: 2,
        pointHoverBackgroundColor: t.navy[800],
        pointHoverBorderColor: t.surface,
        pointHoverBorderWidth: 2,
      },
      {
        label: 'Actual',
        data: realisasi,
        // Actual: solid orange with a very light flat fill
        borderColor: t.orange[500],
        backgroundColor: alpha(t.orange[500], 0.08),
        borderWidth: 2.75,
        tension: 0.35,
        fill: true,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 7 : 3.5),
        pointHoverRadius: 7,
        pointBackgroundColor: t.orange[500],
        pointBorderColor: t.surface,
        pointBorderWidth: 2,
        pointHoverBackgroundColor: t.orange[500],
        pointHoverBorderColor: t.surface,
        pointHoverBorderWidth: 2.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 850,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          font: { size: 12, weight: '600', family: 'var(--font-jakarta), Arial, sans-serif' },
          color: t.ink.secondary,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: t.navy[950],
        titleColor: t.surface,
        bodyColor: t.surface,
        footerColor: t.navy[300],
        borderWidth: 0,
        padding: 12,
        boxPadding: 6,
        cornerRadius: 12,
        caretSize: 6,
        titleFont: { weight: '600' },
        usePointStyle: true,
        callbacks: {
          afterTitle(items) {
            const point = items[0];
            if (!point) return '';
            const idx = point.dataIndex;
            const pVal = Number(rencana[idx] || 0);
            const aVal = realisasi[idx] != null ? Number(realisasi[idx]) : null;
            if (aVal == null) return 'Status: Scheduled / Pending';
            const dev = Number((aVal - pVal).toFixed(2));
            if (dev < -0.1) return `Variance: ${dev}% (Behind Schedule)`;
            if (dev > 0.1) return `Variance: +${dev}% (Ahead of Plan)`;
            return 'Variance: 0.00% (On Schedule)';
          },
          label(context) {
            const name = context.dataset.label || '';
            if (context.parsed.y === null) return ` ${name}: —`;
            return ` ${name}: ${Number(context.parsed.y).toFixed(2)}%`;
          },
          afterBody(items) {
            const point = items[0];
            if (!point) return [];
            const weekNumber = Number(String(chartLabels[point.dataIndex]).match(/\d+/)?.[0]);
            const weekReports = reports.filter((report) => Number(report.minggu_ke) === weekNumber);
            if (!weekReports.length) return [];
            return [
              '',
              'Work Items Reported:',
              ...weekReports.map((report) =>
                `• ${report.kode_pekerjaan} · ${report.nama_pekerjaan}: ${Number(report.realisasi_bobot).toFixed(2)}% (${report.status_verifikasi})`
              ),
            ];
          },
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick(event, _elements, chart) {
      if (!onWeekSelect) return;
      const points = chart.getElementsAtEventForMode(
        event,
        'index',
        { intersect: false },
        false
      );
      const pointIndex = points[0]?.index;
      if (pointIndex == null) return;
      const weekNumber = Number(String(chartLabels[pointIndex]).match(/\d+/)?.[0]);
      if (Number.isInteger(weekNumber) && weekNumber > 0) onWeekSelect(weekNumber);
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: t.ink.secondary },
        border: { color: t.line },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: t.ink.secondary,
          callback(value) {
            return `${value}%`;
          },
        },
        grid: { color: t.grid, drawTicks: false },
        border: { display: false, dash: [4, 4] },
      },
    },
  };

  return (
    <div className={`w-full h-72 sm:h-80 relative ${onWeekSelect ? 'cursor-pointer' : ''}`}>
      <Line data={data} options={options} />
    </div>
  );
}
