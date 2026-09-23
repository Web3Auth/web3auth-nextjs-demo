import { arbitrumExplorerUrl, type FlowEvent } from "./shared";

export function ActivityLog({ events }: { events: FlowEvent[] }) {
  return (
    <article className="panel log-panel">
      <div className="panel-heading">
        <div>
          <p className="step-label">Live event log</p>
          <h2>Wallet and transaction activity</h2>
        </div>
        <span className="count-badge">{events.length}</span>
      </div>
      {events.length === 0 ? (
        <p className="muted">Wallet events and transaction receipts appear here.</p>
      ) : (
        <ol className="event-list" aria-live="polite">
          {events.map((event) => (
            <li key={event.id} className={event.tone}>
              <time>{event.at}</time>
              <span>
                {event.message}
                {event.hash ? (
                  <>
                    {" "}
                    <a
                      href={arbitrumExplorerUrl("tx", event.hash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {event.hash.slice(0, 10)}…
                    </a>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
