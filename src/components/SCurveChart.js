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
      <div className="w-full h-72 flex flex-col items-center justify-center text-sm text-navy-400">
        <div className="flex items-end justify-center gap-2 h-24 mb-4 opacity-40">
          <div className="w-6 bg-navy-200 rounded-t h-[30%]" />
          <div className="w-6 bg-navy-300 rounded-t h-[55%]" />
          <div className="w-6 bg-brand-400 rounded-t h-[80%]" />
          <div className="w-6 bg-teal-400 rounded-t h-[45%]" />
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
        // Planned: dashed teal baseline with a faint wash
        borderColor: '#0d9488',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(13, 148, 136, 0.03)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(13, 148, 136, 0.07)');
          gradient.addColorStop(1, 'rgba(13, 148, 136, 0.0)');
          return gradient;
        },
        borderWidth: 2.25,
        borderDash: [7, 5],
        tension: 0.35,
        fill: true,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 7 : 3),
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0d9488',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#0d9488',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2.5,
      },
      {
        label: 'Actual',
        data: realisasi,
        // Actual: solid SDG 9 orange with gradient fill
        borderColor: '#fd6925',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(253, 105, 37, 0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(253, 105, 37, 0.22)');
          gradient.addColorStop(0.65, 'rgba(253, 105, 37, 0.05)');
          gradient.addColorStop(1, 'rgba(253, 105, 37, 0.0)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 7.5 : 4),
        pointHoverRadius: 7.5,
        pointBackgroundColor: '#fd6925',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#fd6925',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
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
          color: '#475569',
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        footerColor: '#64748b',
        borderColor: 'rgba(253, 105, 37, 0.3)',
        borderWidth: 1,
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
        ticks: { font: { size: 11 }, color: '#94a3b8' },
        border: { color: 'rgba(148, 163, 184, 0.35)' },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#94a3b8',
          callback(value) {
            return `${value}%`;
          },
        },
        grid: { color: 'rgba(148, 163, 184, 0.16)', drawTicks: false },
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
