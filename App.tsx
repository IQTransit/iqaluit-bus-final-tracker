
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { IQALUIT_STOPS } from './constants';
import { TransitState, AIAdvice, Stop } from './types';
import RouteMap from './components/RouteMap';
import StopItem from './components/StopItem';
import { getTransitAdvice } from './services/geminiService';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Bell, 
  RefreshCcw, 
  Navigation2, 
  Wifi, 
  ThermometerSnowflake,
  ShieldAlert,
  AlertCircle,
  LocateFixed,
  WifiOff,
  Search,
  RotateCw,
  Globe,
  Zap
} from 'lucide-react';

const GPS_FEED_URL = "https://fireortrash.com/gps";

const App: React.FC = () => {
  const [state, setState] = useState<TransitState>({
    busStopIndex: 0,
    userStopIndex: 5, 
    lastUpdated: new Date(),
    isMoving: false,
  });

  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<'active' | 'searching' | 'offline'>('searching');
  const [connectionMethod, setConnectionMethod] = useState<'direct' | 'proxy' | 'none'>('none');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  
  // Track AI Hibernation state to prevent 429s
  const [aiHibernationUntil, setAiHibernationUntil] = useState<number>(0);

  const lastBusIndex = useRef(-1);
  const lastAiRequestTime = useRef(0);

  const stopsAway = useMemo(() => {
    let diff = state.userStopIndex - state.busStopIndex;
    if (diff < 0) {
      return (IQALUIT_STOPS.length - state.busStopIndex) + state.userStopIndex;
    }
    return diff;
  }, [state.busStopIndex, state.userStopIndex]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const findClosestStop = useCallback((lat: number, lng: number) => {
    let closestIndex = 0;
    let minDistance = Infinity;

    IQALUIT_STOPS.forEach((stop, index) => {
      const dist = getDistance(lat, lng, stop.lat, stop.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, []);

  const updateAdvice = useCallback(async (isManual: boolean = false) => {
    const now = Date.now();
    
    // Logic to prevent spamming Gemini
    if (!isManual) {
      if (now < aiHibernationUntil) return; // In cooldown
      if (now - lastAiRequestTime.current < 45000) return; // Min 45s between auto-calls
      if (state.busStopIndex === lastBusIndex.current) return; // Only call if bus moved
    }

    setIsAiLoading(true);
    setRefreshCooldown(30);

    const busStop = IQALUIT_STOPS[state.busStopIndex];
    const userStop = IQALUIT_STOPS[state.userStopIndex];
    
    try {
      const advice = await getTransitAdvice(busStop, userStop, stopsAway);
      setAiAdvice(advice);
      
      if (advice.isQuotaError) {
        // If Gemini is exhausted, wait 5 mins before trying AI again
        setAiHibernationUntil(Date.now() + 300000);
      }
      
      lastAiRequestTime.current = now;
      lastBusIndex.current = state.busStopIndex;
    } catch (e) {
      console.error("Advice update failed", e);
    } finally {
      setIsAiLoading(false);
    }
  }, [state.busStopIndex, state.userStopIndex, stopsAway, aiHibernationUntil]);

  // Enhanced Multi-Proxy Fetch Logic
  const fetchWithResilience = async (url: string) => {
    const proxies = [
      (u: string) => fetch(u, { method: 'GET', cache: 'no-store' }), // Direct
      (u: string) => fetch(`https://corsproxy.io/?${encodeURIComponent(u)}`), // Proxy 1
      (u: string) => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(u)}`).then(r => r.json().then(j => ({ ok: true, json: () => Promise.resolve(JSON.parse(j.contents)) }))), // Proxy 2
      (u: string) => fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`) // Proxy 3
    ];

    for (let i = 0; i < proxies.length; i++) {
      try {
        const res: any = await proxies[i](url);
        if (res.ok) {
          const data = await res.json();
          setConnectionMethod(i === 0 ? 'direct' : 'proxy');
          return data;
        }
      } catch (e) {
        console.warn(`Fetch method ${i} failed. Trying next...`);
      }
    }
    throw new Error("Fleet link disconnected. All satellite proxies are unreachable.");
  };

  useEffect(() => {
    const fetchGps = async () => {
      const targetUrl = `${GPS_FEED_URL}?cb=${Date.now()}`;
      try {
        setFetchError(null);
        const rawData = await fetchWithResilience(targetUrl);
        const busData = Array.isArray(rawData) ? rawData[0] : rawData;
        
        if (busData && typeof busData.lat === 'number' && typeof busData.lng === 'number') {
          const closestIndex = findClosestStop(busData.lat, busData.lng);
          setState(prev => ({
            ...prev,
            busStopIndex: closestIndex,
            lastUpdated: new Date()
          }));
          setGpsStatus('active');
        } else {
          throw new Error("Telemetry frame corrupted.");
        }
      } catch (err: any) {
        setGpsStatus('offline');
        setConnectionMethod('none');
        setFetchError(err.message);
      }
    };

    const interval = setInterval(fetchGps, 10000);
    fetchGps(); 
    return () => clearInterval(interval);
  }, [findClosestStop, retryTrigger]);

  useEffect(() => {
    if (refreshCooldown > 0) {
      const timer = setTimeout(() => setRefreshCooldown(refreshCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshCooldown]);

  useEffect(() => {
    if (gpsStatus === 'active') {
      updateAdvice();
    }
  }, [state.busStopIndex, gpsStatus, updateAdvice]);

  const handleFindMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userIdx = findClosestStop(position.coords.latitude, position.coords.longitude);
        setState(prev => ({ ...prev, userStopIndex: userIdx }));
      });
    }
  };

  const isAiHibernating = Date.now() < aiHibernationUntil;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Bus size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Iqaluit Transit</h1>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <div className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'animate-pulse bg-green-500' : 'bg-slate-300'}`}></div>
              <span className="font-medium">{gpsStatus === 'active' ? 'Fleet Online' : 'Signal Lost'}</span>
              {connectionMethod === 'proxy' && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Proxy Link</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Agent</span>
             <div className="flex items-center gap-2 text-slate-600">
               <div className={`w-2 h-2 rounded-full ${isAiHibernating ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
               <span className="text-xs font-semibold">{isAiHibernating ? 'Hibernating' : 'Optimized'}</span>
             </div>
          </div>
          <button 
            onClick={() => updateAdvice(true)}
            disabled={isAiLoading || refreshCooldown > 0 || gpsStatus !== 'active'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCcw size={18} className={isAiLoading ? 'animate-spin' : ''} />
            <span className="text-xs font-bold uppercase tracking-tighter">
              {refreshCooldown > 0 ? `${refreshCooldown}s` : 'Request AI'}
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bus Position</span>
               <p className="text-lg font-bold text-slate-800">{gpsStatus === 'active' ? IQALUIT_STOPS[state.busStopIndex].name : 'Scanning...'}</p>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Station {state.busStopIndex + 1}</p>
            </div>

            <div onClick={handleFindMe} className="glass-card p-5 rounded-2xl shadow-sm space-y-2 cursor-pointer hover:bg-slate-50 transition-colors">
               <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Your Station</span>
               <p className="text-lg font-bold text-slate-800">{IQALUIT_STOPS[state.userStopIndex].name}</p>
               <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter underline">Update GPS</p>
            </div>

            <div className={`glass-card p-5 rounded-2xl shadow-sm space-y-2 transition-all duration-500 text-white border-none ${gpsStatus === 'active' ? 'bg-blue-600 shadow-blue-100' : 'bg-slate-400'}`}>
               <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider block">Lead Stops</span>
               <p className="text-3xl font-black">{gpsStatus === 'active' ? stopsAway : '--'}</p>
               <p className="text-[10px] font-bold uppercase tracking-tighter">To Arrival</p>
            </div>
          </div>

          <div className="glass-card p-1 rounded-3xl shadow-xl overflow-hidden relative min-h-[350px]">
            {gpsStatus !== 'active' && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-8 text-center">
                <WifiOff size={48} className="text-rose-400 mb-4 animate-bounce" />
                <h4 className="text-xl font-black text-slate-800">Satellite Signal Interrupted</h4>
                <p className="text-xs font-mono text-slate-500 mt-2 bg-slate-100 p-2 rounded max-w-xs">{fetchError || "Waiting for secure data tunnel..."}</p>
                <button onClick={() => setRetryTrigger(t => t + 1)} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200">Force Reconnect</button>
              </div>
            )}
            <div className="p-6 pb-2">
               <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                 <Zap size={18} className="text-amber-500" />
                 Live Arctic Telemetry
               </h3>
            </div>
            <RouteMap busIndex={state.busStopIndex} userIndex={state.userStopIndex} />
          </div>

          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center gap-6 shadow-lg transition-all duration-500 ${aiAdvice?.isQuotaError ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="bg-slate-100 p-4 rounded-2xl">
              {aiAdvice?.isQuotaError ? <AlertCircle className="text-amber-500" /> : <ShieldAlert className="text-blue-500" />}
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {aiAdvice?.isQuotaError ? 'Local Dispatch Engine' : 'Gemini AI Intelligence'}
              </span>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                {isAiLoading ? "Syncing..." : (gpsStatus === 'active' ? aiAdvice?.message : "Waiting for GPS...")}
              </h3>
              <div className="flex gap-4 mt-2">
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                  <ThermometerSnowflake size={10} /> -28°C
                </span>
                {isAiHibernating && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">AI Cooldown Active</span>}
              </div>
            </div>
            <div className="text-center bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ETA</span>
               <span className="text-3xl font-black text-slate-800">{isAiLoading ? '--' : aiAdvice?.eta}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="glass-card flex-1 rounded-3xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                <Bell size={18} className="text-blue-600" />
                Fleet Schedule
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar max-h-[700px]">
              {IQALUIT_STOPS.map((stop, index) => (
                <StopItem 
                  key={stop.id}
                  stop={stop}
                  index={index}
                  isBusHere={gpsStatus === 'active' && state.busStopIndex === index}
                  isUserHere={state.userStopIndex === index}
                  isBetween={gpsStatus === 'active' && ((state.busStopIndex < state.userStopIndex && index > state.busStopIndex && index < state.userStopIndex) || (state.busStopIndex > state.userStopIndex && (index > state.busStopIndex || index < state.userStopIndex)))}
                />
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Linked to fireortrash.com/gps</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
          Arctic Transit Labs · Live Satellite Uplink v4.1
        </p>
      </footer>
    </div>
  );
};

export default App;
