import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ActionType = 'repair' | 'inspect' | 'maintenance';

type PriorityItem = {
  id: number;
  rank: number;
  location: string;
  issue: string;
  risk: 'CRITICAL' | 'HIGH' | 'MODERATE';
  context: string;
  action: ActionType;
};

const priorityData: PriorityItem[] = [
  {
    id: 1,
    rank: 1,
    location: 'Inner Circle, CP',
    issue: '3 Faulty Streetlights',
    risk: 'CRITICAL',
    context:
      'Near active theft report (10m ago). High pedestrian exposure.',
    action: 'repair',
  },
  {
    id: 2,
    rank: 2,
    location: 'Janpath',
    issue: 'Dark Zone (40% coverage)',
    risk: 'HIGH',
    context:
      'Recent harassment incident (1h ago). Multiple citizen reports.',
    action: 'inspect',
  },
  {
    id: 3,
    rank: 3,
    location: 'Sansad Marg',
    issue: '1 Faulty Streetlight',
    risk: 'MODERATE',
    context:
      'No recent crimes. Moderate footfall.',
    action: 'maintenance',
  },
];

function getRiskText(risk: PriorityItem['risk']) {
  switch (risk) {
    case 'CRITICAL':
      return 'text-risk-crit';

    case 'HIGH':
      return 'text-risk-high';

    case 'MODERATE':
      return 'text-risk-mod';

    default:
      return 'text-brand-muted';
  }
}

function getRiskBorder(risk: PriorityItem['risk']) {
  switch (risk) {
    case 'CRITICAL':
      return 'border-l-risk-crit';

    case 'HIGH':
      return 'border-l-risk-high';

    case 'MODERATE':
      return 'border-l-risk-mod';

    default:
      return 'border-l-brand-border';
  }
}

function getRiskBackground(risk: PriorityItem['risk']) {
  switch (risk) {
    case 'CRITICAL':
      return 'bg-risk-crit/5';

    case 'HIGH':
      return 'bg-risk-high/5';

    case 'MODERATE':
      return 'bg-risk-mod/5';

    default:
      return '';
  }
}

function getActionLabel(action: ActionType) {
  switch (action) {
    case 'repair':
      return 'Dispatch Repair';

    case 'inspect':
      return 'Inspect Zone';

    case 'maintenance':
      return 'Schedule Maintenance';
  }
}

function getCompletedLabel(action: ActionType) {
  switch (action) {
    case 'repair':
      return '✓ Repair Dispatched';

    case 'inspect':
      return '✓ Inspection Logged';

    case 'maintenance':
      return '✓ Maintenance Scheduled';
  }
}

export default function ActionPriority() {
  const navigate = useNavigate();

  /*
   * Stores which actions have been completed.
   * This is local for now.
   * Later this can be replaced with the backend/database.
   */
  const [completedActions, setCompletedActions] =
    useState<Record<number, boolean>>({});

  function handleAction(item: PriorityItem) {
    setCompletedActions((prev) => ({
      ...prev,
      [item.id]: true,
    }));
  }

  function handleLocationClick(location: string) {
    navigate(
      `/map?road=${encodeURIComponent(location)}`
    );
  }

  return (
    <div className="p-8">

      {/* HEADER */}

      <header className="mb-8">

        <h2 className="text-2xl font-semibold text-brand-text">
          Intervention Priority
        </h2>

        <p className="mt-1 text-sm text-brand-muted">
          Combined list of streetlights and zones requiring
          immediate action based on crime proximity and risk score.
        </p>

      </header>


      {/* TABLE */}

      <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">

        <table className="w-full text-left text-sm text-brand-text">

          {/* TABLE HEADER */}

          <thead className="border-b border-brand-border bg-brand-dark/50 text-xs uppercase text-brand-muted">

            <tr>

              <th className="px-6 py-4 font-medium">
                Rank
              </th>

              <th className="px-6 py-4 font-medium">
                Location
              </th>

              <th className="px-6 py-4 font-medium">
                Issue
              </th>

              <th className="px-6 py-4 font-medium">
                Proximity / Risk Context
              </th>

              <th className="px-6 py-4 font-medium">
                Action
              </th>

            </tr>

          </thead>


          {/* TABLE BODY */}

          <tbody className="divide-y divide-brand-border">

            {priorityData.map((item) => {

              const completed =
                completedActions[item.id];

              return (

                <tr
                  key={item.id}
                  className={`
                    border-l-4
                    ${getRiskBorder(item.risk)}
                    ${getRiskBackground(item.risk)}
                    transition
                    hover:bg-white/[0.025]
                  `}
                >

                  {/* RANK */}

                  <td
                    className={`px-6 py-5 font-bold ${getRiskText(
                      item.risk
                    )}`}
                  >
                    #{item.rank}
                  </td>


                  {/* LOCATION */}

                  <td className="px-6 py-5">

                    <button
                      onClick={() =>
                        handleLocationClick(item.location)
                      }
                      className="text-left font-medium text-brand-text transition hover:text-primary hover:underline"
                    >
                      {item.location}
                    </button>

                  </td>


                  {/* ISSUE */}

                  <td className="px-6 py-5">

                    <span className="text-brand-text">
                      {item.issue}
                    </span>

                  </td>


                  {/* CONTEXT */}

                  <td className="px-6 py-5">

                    <span
                      className={`mb-1 block text-xs font-semibold ${getRiskText(
                        item.risk
                      )}`}
                    >
                      {item.risk} RISK
                    </span>

                    <span className="text-xs text-brand-muted">
                      {item.context}
                    </span>

                  </td>


                  {/* ACTION */}

                  <td className="px-6 py-5">

                    {completed ? (

                      <span className="inline-flex items-center rounded px-3 py-1.5 text-xs font-medium text-green-400">
                        {getCompletedLabel(item.action)}
                      </span>

                    ) : (

                      <button
                        onClick={() =>
                          handleAction(item)
                        }
                        className={
                          item.action === 'repair'
                            ? 'rounded bg-primary px-3 py-1.5 text-sm text-white transition hover:bg-primary/90'
                            : 'rounded border border-brand-border bg-brand-dark px-3 py-1.5 text-sm text-brand-text transition hover:bg-brand-border'
                        }
                      >
                        {getActionLabel(item.action)}
                      </button>

                    )}

                  </td>

                </tr>

              );
            })}

          </tbody>

        </table>

      </div>

    </div>
  );
}