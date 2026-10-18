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
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.10)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 6 : 3),
        pointHoverRadius: 6,
        pointBackgroundColor: '#0f766e',
      },
      {
        label: 'Actual',
        data: realisasi,
        borderColor: '#111827',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointRadius: (context) => (context.dataIndex + 1 === selectedWeek ? 6 : 3),
        pointHoverRadius: 6,
        pointBackgroundColor: '#111827',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          afterBody(items) {
            const point = items[0];
            if (!point) return [];
            const weekNumber = Number(String(chartLabels[point.dataIndex]).match(/\d+/)?.[0]);
            const weekReports = reports.filter((report) => Number(report.minggu_ke) === weekNumber);
            if (!weekReports.length) return ['No work item reports'];
            return [
              'Reported work:',
              ...weekReports.map((report) =>
                `${report.kode_pekerjaan} · ${report.nama_pekerjaan}: ${Number(report.realisasi_bobot).toFixed(2)}% (${report.status_verifikasi})`
              ),
            ];
          },
          label(context) {
            const name = context.dataset.label || '';
            if (context.parsed.y === null) return `${name}: -`;
            return `${name}: ${context.parsed.y}%`;
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
        ticks: { font: { size: 11 }, color: '#9ca3af' },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#9ca3af',
          callback(value) {
            return `${value}%`;
          },
        },
        grid: { color: '#f3f4f6' },
      },
    },
  };

  return (
    <div className={`w-full h-72 relative ${onWeekSelect ? 'cursor-pointer' : ''}`}>
      <Line data={data} options={options} />
    </div>
  );
}
