"use client"

import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, CheckCircle, XCircle } from 'lucide-react';

export interface MasterRecord {
  id: string;
  trackName: string;
  date: string;
  genre: string;       // used for platform label
  lufsBefor: number;
  lufsAfter: number;
  referenceUsed: boolean;
  downloadUrl: string;
}

type SortKey = 'trackName' | 'date' | 'genre' | 'lufsAfter';
type SortDir = 'asc' | 'desc';

const DEMO: MasterRecord[] = [
  { id: '1', trackName: 'Summer Haze',     date: '2026-05-30', genre: 'Pop',      lufsBefor: -22.1, lufsAfter: -14.0, referenceUsed: true,  downloadUrl: '#' },
  { id: '2', trackName: 'Night Drive',     date: '2026-05-28', genre: 'Lo-Fi',    lufsBefor: -20.4, lufsAfter: -16.0, referenceUsed: false, downloadUrl: '#' },
  { id: '3', trackName: 'Bass Drop Vol.2', date: '2026-05-25', genre: 'EDM',      lufsBefor: -18.7, lufsAfter: -9.0,  referenceUsed: true,  downloadUrl: '#' },
  { id: '4', trackName: 'Acoustic Soul',   date: '2026-05-21', genre: 'Folk',     lufsBefor: -24.3, lufsAfter: -16.0, referenceUsed: false, downloadUrl: '#' },
  { id: '5', trackName: 'Club Ready',      date: '2026-05-18', genre: 'House',    lufsBefor: -19.2, lufsAfter: -8.0,  referenceUsed: true,  downloadUrl: '#' },
  { id: '6', trackName: 'Chill Wave',      date: '2026-05-15', genre: 'Chillout', lufsBefor: -21.0, lufsAfter: -14.0, referenceUsed: true,  downloadUrl: '#' },
];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className="text-gray-600" />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-purple-400" />
    : <ArrowDown size={12} className="text-purple-400" />;
}

export default function MasteringHistoryTable({ records }: { records?: MasterRecord[] }) {
  const data = records ?? DEMO;
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...data].sort((a, b) => {
    let va: string | number = a[sortKey];
    let vb: string | number = b[sortKey];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const Th = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-widest cursor-pointer select-none whitespace-nowrap transition-colors
        ${sortKey === col ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ background: '#0F0E1C', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-white font-bold text-base">Mastering History</h2>
        <span className="text-xs text-gray-500">{sorted.length} tracks</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(168,85,247,0.05)' }}>
            <tr>
              <Th label="Track Name" col="trackName" />
              <Th label="Date"       col="date"      />
              <Th label="Platform"   col="genre"     />
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-gray-500 whitespace-nowrap">LUFS</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-gray-500 whitespace-nowrap">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-gray-500">Download</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.id}
                className="border-t border-white/5 transition-colors hover:bg-purple-500/5"
                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
              >
                <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{row.trackName}</td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20">
                    {row.genre}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-gray-500 tabular-nums">{row.lufsBefor.toFixed(1)}</span>
                  <span className="text-gray-600 mx-1.5">→</span>
                  <span className="text-green-400 tabular-nums font-medium">{row.lufsAfter.toFixed(1)}</span>
                  <span className="text-gray-600 text-xs ml-1">LUFS</span>
                </td>
                <td className="px-4 py-3">
                  {row.referenceUsed
                    ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={13} /> Yes</span>
                    : <span className="flex items-center gap-1 text-gray-600 text-xs"><XCircle size={13} /> No</span>}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={row.downloadUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/60 transition-all whitespace-nowrap w-fit"
                  >
                    <Download size={12} />
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
