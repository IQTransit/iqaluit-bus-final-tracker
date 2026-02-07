
import React from 'react';
import { Stop } from '../types';

interface StopItemProps {
  stop: Stop;
  index: number;
  isBusHere: boolean;
  isUserHere: boolean;
  isBetween: boolean;
}

const StopItem: React.FC<StopItemProps> = ({ stop, index, isBusHere, isUserHere, isBetween }) => {
  return (
    <div className={`
      flex items-center justify-between p-4 rounded-xl border transition-all duration-300
      ${isBusHere ? 'bg-green-50 border-green-200 ring-2 ring-green-100' : 
        isUserHere ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 
        isBetween ? 'bg-slate-50 border-slate-200 border-dashed' : 'bg-white border-slate-100'}
    `}>
      <div className="flex items-center gap-4">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
          ${isBusHere ? 'bg-green-600 text-white' : 
            isUserHere ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}
        `}>
          {index + 1}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-800">{stop.name}</h4>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-wider font-bold">
              {stop.tag}
            </span>
          </div>
          <p className="text-xs text-slate-500">{stop.description}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {isBusHere && (
          <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md animate-pulse">
            BUS IS HERE
          </span>
        )}
        {isUserHere && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
            MY STOP
          </span>
        )}
        {!isBusHere && !isUserHere && isBetween && (
          <span className="text-[10px] text-slate-400 font-medium">In Transit</span>
        )}
      </div>
    </div>
  );
};

export default StopItem;
