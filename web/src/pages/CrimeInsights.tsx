export default function Analytics() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold text-brand-text">Analytics</h2>
        <p className="text-brand-muted mt-1 text-sm">Historical trends and aggregated safety data.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Crime by Type */}
        <div className="bg-brand-surface rounded-lg border border-brand-border p-5">
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">Historical Incidents by Type</h3>
          <div className="space-y-3">
            {[
              { type: 'Theft', count: 42, pct: 85 },
              { type: 'Harassment', count: 28, pct: 57 },
              { type: 'Assault', count: 15, pct: 30 },
              { type: 'Vandalism', count: 9, pct: 18 },
              { type: 'Other', count: 6, pct: 12 },
            ].map(item => (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brand-text">{item.type}</span>
                  <span className="text-brand-muted">{item.count}</span>
                </div>
                <div className="w-full bg-brand-dark rounded h-1.5">
                  <div className="bg-primary h-1.5 rounded" style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents by Area */}
        <div className="bg-brand-surface rounded-lg border border-brand-border p-5">
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">Incidents by Area</h3>
          <div className="space-y-3">
            {[
              { area: 'Inner Circle, CP', count: 31, pct: 90 },
              { area: 'Janpath', count: 22, pct: 64 },
              { area: 'Sansad Marg', count: 14, pct: 40 },
              { area: 'Barakhamba Road', count: 8, pct: 23 },
            ].map(item => (
              <div key={item.area}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brand-text">{item.area}</span>
                  <span className="text-brand-muted">{item.count}</span>
                </div>
                <div className="w-full bg-brand-dark rounded h-1.5">
                  <div className="bg-risk-mod h-1.5 rounded" style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk by Time */}
      <div className="bg-brand-surface rounded-lg border border-brand-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">Average Risk by Hour</h3>
        <div className="flex items-end gap-1 h-32">
          {[
            { hour: '6 PM', risk: 20 },
            { hour: '7 PM', risk: 30 },
            { hour: '8 PM', risk: 45 },
            { hour: '9 PM', risk: 60 },
            { hour: '10 PM', risk: 75 },
            { hour: '11 PM', risk: 88 },
            { hour: '12 AM', risk: 92 },
            { hour: '1 AM', risk: 85 },
            { hour: '2 AM', risk: 78 },
            { hour: '3 AM', risk: 65 },
            { hour: '4 AM', risk: 50 },
            { hour: '5 AM', risk: 30 },
          ].map(item => {
            const color = item.risk > 75 ? 'bg-risk-crit' : item.risk > 55 ? 'bg-risk-high' : item.risk > 30 ? 'bg-risk-mod' : 'bg-risk-low';
            return (
              <div key={item.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full ${color} rounded-t`} style={{ height: `${item.risk}%` }}></div>
                <span className="text-[9px] text-brand-muted">{item.hour}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streetlight Status */}
      <div className="bg-brand-surface rounded-lg border border-brand-border p-5">
        <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">Streetlight Fleet Status</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold text-risk-low">1,047</p>
            <p className="text-xs text-brand-muted mt-1">Working</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-risk-mod">183</p>
            <p className="text-xs text-brand-muted mt-1">Faulty</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-primary">42</p>
            <p className="text-xs text-brand-muted mt-1">Under Repair</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-brand-muted">12</p>
            <p className="text-xs text-brand-muted mt-1">Unknown</p>
          </div>
        </div>
      </div>
    </div>
  );
}
