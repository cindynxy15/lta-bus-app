/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bus, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  Search, 
  MapPin,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface BusService {
  ServiceNo: string;
  nextBuses: number[];
}

interface BusArrivalResponse {
  BusStopCode: string;
  Services: BusService[];
  error?: string;
  upstreamStatus?: number;
}

interface HealthResponse {
  keyConfigured: boolean;
  upstreamAnswered: boolean;
  upstreamStatus: number | null;
  message?: string;
  error?: string;
}

// Preset popular Singapore bus stops for easy testing
const PRESET_STOPS = [
  { code: '04121', name: 'Opp The Treasury (SMU)', desc: 'Near Singapore Management University & Hill St' },
  { code: '08057', name: 'Dhoby Ghaut Stn', desc: 'Plaza Singapura / Orchard Rd corridor' },
  { code: '01012', name: 'Hotel Grand Pacific', desc: 'Victoria St / Bras Basah Arts District' },
  { code: '04111', name: 'Armenian Ch', desc: 'Armenian St / Central Business District' },
  { code: '03011', name: 'Opp The Ritz-Carlton', desc: 'Marina Bay Tourism & Promenade' },
];

export default function App() {
  const [busStopCode, setBusStopCode] = useState<string>('04121');
  const [searchInput, setSearchInput] = useState<string>('04121');
  const [data, setData] = useState<BusArrivalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(20);
  
  // Health check state
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(false);
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);

  // Dynamic access date for licence compliance
  const accessDateString = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Fetch live bus arrivals from local API handler
  const fetchBusArrivals = useCallback(async (code: string, isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/bus?BusStopCode=${encodeURIComponent(code)}`);
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || `Server error (${res.status})`);
        setData(null);
      } else {
        setData(json);
        setLastUpdated(new Date());
        setCountdown(20);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to connect to local API route.'
      );
      setData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Check API health endpoint
  const checkHealth = useCallback(async () => {
    setIsHealthChecking(true);
    try {
      const res = await fetch('/api/health');
      const json: HealthResponse = await res.json();
      setHealthData(json);
    } catch {
      setHealthData({
        keyConfigured: false,
        upstreamAnswered: false,
        upstreamStatus: null,
        error: 'Health check failed to connect'
      });
    } finally {
      setIsHealthChecking(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchBusArrivals(busStopCode);
    checkHealth();
  }, [busStopCode, fetchBusArrivals, checkHealth]);

  // 20-second auto-refresh interval matching LTA DataMall refresh frequency & Cache-Control
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchBusArrivals(busStopCode);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [busStopCode, fetchBusArrivals]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = searchInput.trim();
    if (cleanCode) {
      setBusStopCode(cleanCode);
      setIsLoading(true);
    }
  };

  const handleSelectPreset = (code: string) => {
    setSearchInput(code);
    setBusStopCode(code);
    setIsLoading(true);
  };

  const formatArrivalBadge = (minutes: number) => {
    if (minutes <= 0) {
      return (
        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-sm font-semibold tracking-tight">
          Arriving
        </span>
      );
    }
    if (minutes === 1) {
      return (
        <span className="inline-flex items-center text-slate-800 bg-slate-100 px-2.5 py-1 rounded text-sm font-semibold tabular-nums">
          1 min
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-slate-800 bg-slate-100 px-2.5 py-1 rounded text-sm font-semibold tabular-nums">
        {minutes} mins
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-200">
      {/* Top Bar Contract: 1 row, 3 zones */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              SG Bus Live
            </span>
          </div>

          {/* Zone 2: Navigation / Info */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Refreshes every 20s</span>
            </span>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => {
                checkHealth();
                setShowHealthModal(true);
              }}
              className="text-xs hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Service Health</span>
              {healthData?.keyConfigured ? (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-0.5" title="Key configured" />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-0.5" title="Check key configuration" />
              )}
            </button>
          </div>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchBusArrivals(busStopCode, true)}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
              title="Refresh now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh ({countdown}s)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Bus Stop Selector & Controls */}
        <section className="mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
                  Bus Stop {busStopCode}
                </h1>
                <p className="text-sm text-slate-500">
                  {PRESET_STOPS.find(s => s.code === busStopCode)?.name || 'Live DataMall Bus Arrival Timings'}
                  {lastUpdated && (
                    <>
                      <span className="mx-2" aria-hidden="true">·</span>
                      <span>Last updated at {lastUpdated.toLocaleTimeString()}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-56">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Enter 5-digit code (e.g. 04121)"
                    maxLength={6}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Lookup
                </button>
              </form>
            </div>

            {/* Quick Presets */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-400 mb-2.5">
                Popular Bus Stops:
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_STOPS.map((stop) => {
                  const isSelected = busStopCode === stop.code;
                  return (
                    <button
                      key={stop.code}
                      onClick={() => handleSelectPreset(stop.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="font-mono">{stop.code}</span>
                      <span className="opacity-75 hidden sm:inline">({stop.name})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Error Notification / Banner */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4 text-red-900 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-red-800 mb-1">
                Unable to load arrival times
              </div>
              <p className="text-red-700 mb-3">{errorMessage}</p>
              {errorMessage.includes('LTA_ACCOUNT_KEY') && (
                <div className="bg-white/80 border border-red-200 rounded-lg p-3 text-xs text-slate-700 space-y-1 font-mono">
                  <div>Configuration required:</div>
                  <div>1. Provide your LTA DataMall key in <code className="text-red-800 font-bold">LTA_ACCOUNT_KEY</code> environment variable.</div>
                  <div>2. On Vercel, set it in Project Settings → Environment Variables.</div>
                  <div>3. In AI Studio Preview, set it in the Secrets panel.</div>
                </div>
              )}
              <div className="mt-3">
                <button
                  onClick={() => fetchBusArrivals(busStopCode, true)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-md transition-colors cursor-pointer"
                >
                  Retry Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Bus Arrival Panel */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header Row */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Live Bus Arrivals
              </span>
              <span className="text-xs text-slate-400 font-normal">
                (Stop {busStopCode})
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="hidden sm:inline">Next arrivals rounded down to whole minutes</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live connection" />
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="px-6 py-5 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-8 bg-slate-200 rounded"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-7 bg-slate-200 rounded"></div>
                    <div className="w-20 h-7 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : data?.Services && data.Services.length > 0 ? (
            /* Services Listing */
            <div className="divide-y divide-slate-100">
              {data.Services.map((service, idx) => {
                const buses = service.nextBuses || [];
                const hasBuses = buses.length > 0;

                return (
                  <div
                    key={`${service.ServiceNo}-${idx}`}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/75 transition-colors"
                  >
                    {/* Service Number */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-10 bg-slate-900 text-white rounded-lg font-bold font-mono text-lg flex items-center justify-center tracking-tight shrink-0 shadow-xs">
                        {service.ServiceNo}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Bus Service {service.ServiceNo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {hasBuses 
                            ? `${buses.length} upcoming ${buses.length === 1 ? 'bus' : 'buses'} tracked`
                            : 'No active buses in service'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Arrivals or Plain Sentence */}
                    <div className="flex items-center gap-3">
                      {hasBuses ? (
                        <div className="flex items-center gap-3">
                          {/* Next Bus 1 */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                              Next Bus
                            </span>
                            {formatArrivalBadge(buses[0])}
                          </div>

                          {/* Next Bus 2 */}
                          {buses.length > 1 ? (
                            <div className="flex flex-col items-end pl-3 border-l border-slate-200">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                                2nd Bus
                              </span>
                              {formatArrivalBadge(buses[1])}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end pl-3 border-l border-slate-200 text-xs text-slate-400 py-1">
                              <span className="text-[10px] uppercase tracking-wider mb-0.5">2nd Bus</span>
                              <span>No 2nd bus</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Plain sentence when a service has no buses running */
                        <p className="text-sm text-slate-500 italic py-1">
                          No buses currently operating for this service.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Plain sentence when an entire bus stop has no services running */
            <div className="p-12 text-center">
              <Bus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-700 mb-1">
                No buses are currently running for this bus stop.
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Services may be outside their operational hours or this stop may not have active lines at this time.
              </p>
            </div>
          )}
        </section>

        {/* API Endpoint Documentation & Health Overview */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">API Endpoint: /api/bus</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Accepts <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">BusStopCode</code> parameter (defaults to 04121). 
              Returns a simplified list with <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">ServiceNo</code> and minutes 
              until each of the next two buses.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
              Cache-Control: s-maxage=20, stale-while-revalidate=40
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">API Endpoint: /api/health</h2>
              </div>
              <button
                onClick={checkHealth}
                disabled={isHealthChecking}
                className="text-xs text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
              >
                {isHealthChecking ? 'Checking...' : 'Check now'}
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Reports whether the key is configured and whether LTA answered without revealing credential secrets.
            </p>
            <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Key Configured:</span>
                <span className={`font-semibold ${healthData?.keyConfigured ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {healthData ? (healthData.keyConfigured ? 'Yes' : 'No') : 'Checking...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Upstream Answered:</span>
                <span className="font-semibold text-slate-900">
                  {healthData ? (healthData.upstreamAnswered ? 'Yes' : 'No') : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Upstream HTTP Status:</span>
                <span className="font-semibold font-mono text-slate-900">
                  {healthData?.upstreamStatus ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Health Check Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">System Health Status</h3>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">LTA Key Configured:</span>
                <span className={`font-semibold ${healthData?.keyConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {healthData?.keyConfigured ? 'Configured' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">LTA DataMall Response:</span>
                <span className="font-semibold text-slate-900">
                  {healthData?.upstreamAnswered ? 'Connected' : 'Unreachable'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Upstream HTTP Status:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {healthData?.upstreamStatus !== null ? healthData?.upstreamStatus : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHealthModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Statutory Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs text-slate-600 leading-relaxed">
            Contains information from LTA DataMall Bus Arrival accessed on {accessDateString} from the Land Transport Authority (LTA DataMall), which is made available under the terms of the Singapore Open Data Licence version 1.0{' '}
            <a
              href="https://data.gov.sg/open-data-licence"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-900 underline hover:text-slate-700 inline-flex items-center gap-0.5 font-medium"
            >
              https://data.gov.sg/open-data-licence
              <ExternalLink className="w-3 h-3 inline-block ml-0.5" />
            </a>
            . This is an SMU course project and is not affiliated with or endorsed by the Land Transport Authority.
          </p>
        </div>
      </footer>
    </div>
  );
}
