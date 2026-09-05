import { getSystemDiagnostics } from "@/services/diagnostics";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const diagnostics = await getSystemDiagnostics();

  const isConnected = diagnostics.connectionStatus === "Connected";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Infrastructure Diagnostics</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50">
                v{diagnostics.applicationVersion}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Urban Furniture Accounting System — Infrastructure & Environment Status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                isConnected
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              {diagnostics.connectionStatus}
            </span>
          </div>
        </header>

        {/* Connection Alert if Error */}
        {!isConnected && diagnostics.connectionError && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm">
            <strong className="font-semibold block text-rose-100 mb-1">
              Connection Health Warning:
            </strong>
            {diagnostics.connectionError}
          </div>
        )}

        {/* Diagnostics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Environment Configuration */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                <span className="text-emerald-400">⚡</span> Environment
              </h2>
              <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300">
                APP_ENV
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">App Environment:</span>
                <span className="font-mono text-emerald-300 font-medium capitalize">
                  {diagnostics.environment}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Node Environment:</span>
                <span className="font-mono text-slate-300">
                  {diagnostics.nodeEnv}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">App Version:</span>
                <span className="font-mono text-slate-300">
                  v{diagnostics.applicationVersion}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Schema Version:</span>
                <span className="font-mono text-slate-300">
                  {diagnostics.schemaVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Database Provider */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                <span className="text-blue-400">🗄️</span> Database Provider
              </h2>
              <span className="text-xs font-mono px-2 py-1 rounded bg-blue-950 text-blue-300 border border-blue-900">
                DATABASE_PROVIDER
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Active Driver:</span>
                <span className="font-mono text-blue-300 font-medium uppercase">
                  {diagnostics.databaseProvider}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Health Status:</span>
                <span
                  className={`font-medium ${
                    isConnected ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {diagnostics.connectionStatus}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Supported:</span>
                <span className="font-mono text-xs text-slate-400">
                  sqlite | turso | postgres
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Storage Provider */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                <span className="text-purple-400">📁</span> Storage Provider
              </h2>
              <span className="text-xs font-mono px-2 py-1 rounded bg-purple-950 text-purple-300 border border-purple-900">
                STORAGE_PROVIDER
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Active Storage:</span>
                <span className="font-mono text-purple-300 font-medium uppercase">
                  {diagnostics.storageProvider}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Supported:</span>
                <span className="font-mono text-xs text-slate-400">
                  local | cloud
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Auth Provider */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                <span className="text-amber-400">🔐</span> Auth Provider
              </h2>
              <span className="text-xs font-mono px-2 py-1 rounded bg-amber-950 text-amber-300 border border-amber-900">
                AUTH_PROVIDER
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Active Auth:</span>
                <span className="font-mono text-amber-300 font-medium uppercase">
                  {diagnostics.authProvider}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Supported:</span>
                <span className="font-mono text-xs text-slate-400">
                  demo | production
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Timestamp */}
        <footer className="text-center text-xs text-slate-500 font-mono border-t border-slate-800/60 pt-6">
          Diagnostic Report Generated At: {diagnostics.timestamp}
        </footer>
      </div>
    </div>
  );
}
