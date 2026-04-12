import { useEffect, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import { getHealth, getMetadataOverview, type HealthResponse, type MetadataOverviewResponse } from "../services/api";

export function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metadata, setMetadata] = useState<MetadataOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const [healthResponse, metadataResponse] = await Promise.all([
          getHealth(),
          getMetadataOverview(),
        ]);

        if (!isMounted) {
          return;
        }

        setHealth(healthResponse);
        setMetadata(metadataResponse);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown dashboard error.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const cubeCount = metadata?.cubes.length ?? 0;
  const measureCount = metadata?.cubes.reduce((sum, cube) => sum + cube.measures.length, 0) ?? 0;
  const hierarchyCount =
    metadata?.cubes.reduce(
      (sum, cube) => sum + cube.dimensions.reduce((dimensionSum, dimension) => dimensionSum + dimension.hierarchies.length, 0),
      0,
    ) ?? 0;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Executive Overview</p>
          <h2>Command dashboard for sales and inventory</h2>
          <p className="muted">
            The metadata layer is now reading from SSAS through ADOMD.NET. The next stage is to keep replacing static
            executive views with real cube queries and guided drill-down.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <KpiCard
          label="API status"
          value={isLoading ? "Loading..." : health?.status?.toUpperCase() ?? "Offline"}
          hint={health ? `${health.service} @ ${health.timeUtc}` : "Checks the backend service first."}
        />
        <KpiCard
          label="SSAS catalog"
          value={health?.ssas.catalog ?? "--"}
          hint={health?.ssas.dataSource ?? "Configured in appsettings.Development.json"}
        />
        <KpiCard
          label="Discovered cubes"
          value={String(cubeCount)}
          hint="Metadata is now being read from the live SSAS catalog."
        />
        <KpiCard
          label="Measures / hierarchies"
          value={`${measureCount} / ${hierarchyCount}`}
          hint="Useful sanity check before we start drill-down and pivot APIs."
        />
      </div>

      {error ? (
        <section className="status-panel error-panel">
          <strong>Dashboard load failed</strong>
          <p>{error}</p>
          <p className="muted">Check that the backend is still running on the URL configured by Vite.</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="status-panel">
          <strong>Loading backend metadata...</strong>
          <p className="muted">The dashboard is waiting for both `/api/health` and `/api/metadata/overview`.</p>
        </section>
      ) : null}

      <SectionCard
        title="Current backend connection"
        description="This verifies that the frontend can see the API and the API can expose analytics metadata."
      >
        <div className="detail-grid">
          <div>
            <p className="detail-label">Service</p>
            <p className="detail-value">{health?.service ?? "--"}</p>
          </div>
          <div>
            <p className="detail-label">Status</p>
            <p className="detail-value">
              <span className={`status-pill ${health?.status === "ok" ? "status-pill-ok" : ""}`}>
                {health?.status ?? "unknown"}
              </span>
            </p>
          </div>
          <div>
            <p className="detail-label">SSAS data source</p>
            <p className="detail-value">{health?.ssas.dataSource ?? "--"}</p>
          </div>
          <div>
            <p className="detail-label">Catalog</p>
            <p className="detail-value">{health?.ssas.catalog ?? "--"}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cube inventory"
        description="This card is now powered by live SSAS metadata, so it is a reliable check against the deployed OLAP model."
      >
        <div className="cube-grid">
          {metadata?.cubes.map((cube) => (
            <article key={cube.name} className="cube-card">
              <header className="cube-card-header">
                <div>
                  <p className="eyebrow">{cube.name}</p>
                  <h3>{cube.caption}</h3>
                </div>
              </header>

              <div className="cube-card-section">
                <p className="detail-label">Dimensions</p>
                <div className="pill-row">
                  {cube.dimensions.map((dimension) => (
                    <span key={`${cube.name}-${dimension.name}`} className="info-pill">
                      {dimension.caption}
                    </span>
                  ))}
                </div>
              </div>

              <div className="cube-card-section">
                <p className="detail-label">Measures</p>
                <div className="pill-row">
                  {cube.measures.map((measure) => (
                    <span key={`${cube.name}-${measure.name}`} className="info-pill">
                      {measure.caption} ({measure.aggregateFunction})
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )) ?? null}
        </div>
      </SectionCard>

      <SectionCard
        title="What the first release should answer"
        description="The first milestone is still a controlled executive workflow rather than a full self-service BI surface."
      >
        <ul className="flat-list">
          <li>Which region, city, or store is driving revenue right now.</li>
          <li>Which products are moving and which inventory positions need attention.</li>
          <li>How to drill from total revenue down to the specific store and month that explains the number.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
