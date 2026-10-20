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
      <div className="w-full h-72 flex flex-col items-center justify-center text-sm text-gray-400">
        <div className="flex items-end justify-center gap-2 h-24 mb-4 opacity-40">
          <div className="w-6 bg-slate-200 rounded-t h-[30%]" />
          <div className="w-6 bg-slate-300 rounded-t h-[55%]" />
          <div className="w-6 bg-teal-400 rounded-t h-[80%]" />
          <div className="w-6 bg-slate-800 rounded-t h-[45%]" />
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
        borderColor: '#0d9488',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(13, 148, 136, 0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(13, 148, 136, 0.22)');
          gradient.addColorStop(0.7, 'rgba(13, 148, 136, 0.05)');
          gradient.addColorStop(1, 'rgba(13, 148, 136, 0.0)');
          return gradient;
        },
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 7 : 3.5),
        pointHoverRadius: 7,
        pointBackgroundColor: '#0d9488',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#0d9488',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2.5,
      },
      {
        label: 'Actual',
        data: realisasi,
        borderColor: '#0f172a',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(15, 23, 42, 0.04)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(15, 23, 42, 0.14)');
          gradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.03)');
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
          return gradient;
        },
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 7 : 3.5),
        pointHoverRadius: 7,
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#0f172a',
        pointHoverBorderColor: '#ffffff',
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
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        cornerRadius: 10,
        usePointStyle: true,
        callbacks: {
          afterTitle(items) {
            const point = items[0];
            if (!point) return '';
            const idx = point.dataIndex;
            const pVal = Number(rencana[idx] || 0);
            const aVal = realisasi[idx] != null ? Number(realisasi[idx]) : null;
            if (aVal == null) return 'Status: Belum dimulai (Sesuai Rencana)';
            const dev = Number((aVal - pVal).toFixed(2));
            if (dev < -0.1) return `Deviasi: ${dev}% (Terlambat)`;
            if (dev > 0.1) return `Deviasi: +${dev}% (Mendahului Rencana)`;
            return 'Deviasi: 0.00% (Tepat Waktu)';
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
              'Laporan Pekerjaan:',
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
        grid: { color: 'rgba(241, 245, 249, 0.9)' },
      },
    },
  };

  return (
    <div className={`w-full h-72 sm:h-80 relative ${onWeekSelect ? 'cursor-pointer' : ''}`}>
      <Line data={data} options={options} />
    </div>
  );
}
