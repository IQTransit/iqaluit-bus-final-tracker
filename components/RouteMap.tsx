
import React, { useMemo } from 'react';
import { Stop } from '../types';
import { IQALUIT_STOPS } from '../constants';

interface RouteMapProps {
  busIndex: number;
  userIndex: number;
}

const RouteMap: React.FC<RouteMapProps> = ({ busIndex, userIndex }) => {
  const points = IQALUIT_STOPS.map(s => `${s.x},${s.y}`).join(' ');

  // Calculate a tighter bounding box for "Zoom In" effect
  const viewBox = useMemo(() => {
    const margin = 60;
    const minX = Math.min(...IQALUIT_STOPS.map(s => s.x)) - margin;
    const maxX = Math.max(...IQALUIT_STOPS.map(s => s.x)) + margin;
    const minY = Math.min(...IQALUIT_STOPS.map(s => s.y)) - margin;
    const maxY = Math.max(...IQALUIT_STOPS.map(s => s.y)) + margin;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    return `${minX} ${minY} ${width} ${height}`;
  }, []);

  return (
    <div className="w-full h-[400px] relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Arctic Grid Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <svg 
        viewBox={viewBox} 
        className="w-full h-full p-4"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Shadow Route */}
        <polyline
          points={points}
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Main Route Path */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 8"
          className="opacity-40"
        />

        {/* Stops & Numbers */}
        {IQALUIT_STOPS.map((stop, idx) => {
          const isActive = idx === busIndex;
          const isTarget = idx === userIndex;
          
          return (
            <g key={stop.id} className="transition-all duration-500">
              {/* Stop Indicator Outer */}
              <circle
                cx={stop.x}
                cy={stop.y}
                r={isActive ? "10" : "6"}
                className={`transition-all duration-700 ${
                  isActive ? 'fill-green-500/20 stroke-green-500 animate-pulse' : 
                  isTarget ? 'fill-blue-500/20 stroke-blue-500' : 
                  'fill-slate-800 stroke-slate-600'
                }`}
                strokeWidth="2"
              />
              {/* Stop Number Label */}
              <text
                x={stop.x}
                y={stop.y - 12}
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
                className={`transition-colors duration-500 uppercase tracking-tighter ${
                  isActive ? 'fill-green-400' : isTarget ? 'fill-blue-400' : 'fill-slate-500'
                }`}
              >
                {idx + 1}
              </text>
              {/* Core Dot */}
              <circle
                cx={stop.x}
                cy={stop.y}
                r="2"
                className={isActive ? 'fill-green-400' : isTarget ? 'fill-blue-400' : 'fill-slate-600'}
              />
            </g>
          );
        })}

        {/* Animated Bus - CSS transitions for smooth motion */}
        <g 
          className="transition-all duration-[3000ms] ease-in-out" 
          style={{ transform: `translate(${IQALUIT_STOPS[busIndex].x}px, ${IQALUIT_STOPS[busIndex].y}px)` }}
          filter="url(#glow)"
        >
           <rect x="-16" y="-12" width="32" height="24" rx="6" fill="#10b981" stroke="white" strokeWidth="2" />
           <path d="M-8,-4 L8,-4 M-8,0 L8,0 M-8,4 L8,4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
           <circle cx="-10" cy="12" r="3" fill="#064e3b" />
           <circle cx="10" cy="12" r="3" fill="#064e3b" />
           <text y="30" fontSize="11" fontWeight="900" fill="#10b981" textAnchor="middle" className="uppercase tracking-widest bg-slate-900/80 px-1">BUS-01</text>
        </g>

        {/* User Destination Marker */}
        <g 
          className="transition-all duration-1000 ease-out"
          style={{ transform: `translate(${IQALUIT_STOPS[userIndex].x}px, ${IQALUIT_STOPS[userIndex].y}px)` }}
        >
           <circle r="20" fill="#3b82f6" fillOpacity="0.15" className="animate-ping" />
           <path d="M0 -15 L5 -5 L15 -5 L7 2 L10 12 L0 6 L-10 12 L-7 2 L-15 -5 L-5 -5 Z" fill="#3b82f6" stroke="white" strokeWidth="2" transform="scale(0.6)" />
           <text y="-25" fontSize="10" fontWeight="900" fill="#3b82f6" textAnchor="middle" className="uppercase tracking-widest drop-shadow-md">YOUR STOP</text>
        </g>
      </svg>

      {/* Map Legend */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Fleet</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-xl">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Destination</span>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-950/40 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-800/50">
        <span>Sector: Iqaluit North</span>
        <div className="w-1 h-1 rounded-full bg-slate-700" />
        <span>Uplink: Active</span>
      </div>
    </div>
  );
};

export default RouteMap;
