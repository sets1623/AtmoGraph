"use client";

import { useEffect, useState } from "react";
import { ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { loadDataset, buildGraph, buildSyntheticGraph, calculateStructuralRisk, propagateDisruption, analyzeDependencies, analyzeImpact, type Graph as SupplyGraph, type SupplyChainDataset } from "../lib/analysis";
import {
  Activity, Network, AlertTriangle, ShieldCheck,
  Globe2, RefreshCw
} from "lucide-react";

type Overview = {
  total_entities: number;
  total_connections: number;
  active_disruptions: number;
  high_risk_entities: number;
  average_risk: number;
  data_type: string;
};

type Disruption = {
  id: string;
  title: string;
  location: string;
  severity: string;
  status: string;
  source: string;
};

type GraphNode = {
  id: string;
  name: string;
  type: string;
  country: string;
  ticker?: string;
  sector?: string;
};

type GraphEdge = {
  source: string;
  target: string;
};

type AffectedEntity = {
  id: string;
  name: string;
  type: string;
  country: string;
  distance: number;
  risk_score: number;
  risk_level: string;
  estimated_delay_days: number;
};

type SimulationHistoryItem = {
  id: number;
  source_entity: string;
  initial_severity: number;
  total_affected: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  timestamp: string;
};

type SimulationResult = {
  source_entity: string;
  initial_severity: number;
  total_affected: number;
  affected_entities: AffectedEntity[];
  method: string;
  data_type: string;
};


type RiskCompany = {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  country: string;
  supplier_count: number;
  customer_count: number;
  downstream_reach: number;
  supplier_scarcity_score: number;
  downstream_exposure_score: number;
  network_centrality_score: number;
  customer_reach_score: number;
  structural_vulnerability_index: number;
  structural_level: string;
  data_source: string;
};

type RiskAnalysis = {
  total_companies: number;
  total_relationships: number;
  companies: RiskCompany[];
  method: string;
  weights: Record<string, number>;
  limitations: string[];
  data_type: string;
};

type DependencyCompany = {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  country: string;
  level: number;
};

type DependencyConnection = {
  source: string;
  target: string;
  level: number;
};

type DependencyResult = {
  source: {
    id: string;
    name: string;
    ticker: string;
    sector: string;
    country: string;
  };
  direction: string;
  depth: number;
  total_companies_found: number;
  total_connections_found: number;
  companies: DependencyCompany[];
  connections: DependencyConnection[];
  data_type: string;
  attribution: string;
};


type ImpactCompany = {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  country: string;
  level: number;
  impact_score: number;
  impact_level: string;
};

type ImpactResult = {
  scenario: string;
  source: {
    id: string;
    name: string;
    ticker: string;
    sector: string;
    country: string;
  };
  initial_severity: number;
  depth: number;
  total_affected: number;
  total_connections: number;
  level_summary: {
    level: number;
    affected_companies: number;
  }[];
  affected_companies: ImpactCompany[];
  connections: DependencyConnection[];
  method: string;
  data_type: string;
  limitations: string[];
  attribution: string;
};

export default function Home() {
  const [localDataset, setLocalDataset] = useState<SupplyChainDataset | null>(null);
  const [localGraph, setLocalGraph] = useState<SupplyGraph | null>(null);

  const [activeWorkspace, setActiveWorkspace] = useState<
    "overview" | "companies" | "risk" | "dependencies" | "impact" | "history"
  >("overview");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<Disruption[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [error, setError] = useState("");
  const [sourceId, setSourceId] = useState("PORT_EU");
  const [severity, setSeverity] = useState(80);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationHistoryItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<GraphNode | null>(null);
  const [datasetMode, setDatasetMode] = useState<"synthetic" | "sectivia">("synthetic");
  const [showFullNetwork, setShowFullNetwork] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");

  const [riskData, setRiskData] = useState<RiskAnalysis | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState("");
  const [dependencyDirection, setDependencyDirection] =
    useState<"upstream" | "downstream">("upstream");
  const [dependencyDepth, setDependencyDepth] = useState("2");
  const [dependencyData, setDependencyData] =
    useState<DependencyResult | null>(null);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  const [dependencyError, setDependencyError] = useState("");
  const [impactSeverity, setImpactSeverity] = useState(80);
  const [impactDepth, setImpactDepth] = useState("3");
  const [impactData, setImpactData] = useState<ImpactResult | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState("");



  async function runImpactAnalysis() {
    if (!selectedEntity || datasetMode !== "sectivia") return;

    try {
      setImpactLoading(true);
      setImpactError("");
      setImpactData(null);

      if (!localGraph) {
        throw new Error("Supply-chain graph is not loaded yet.");
      }

      const result = analyzeImpact(
        localGraph,
        selectedEntity.id,
        impactSeverity,
        Number(impactDepth)
      );

      setImpactData(result);
    } catch (err) {
      setImpactError(
        err instanceof Error ? err.message : "Unable to run impact analysis"
      );
    } finally {
      setImpactLoading(false);
    }
  }

  async function exploreDependencies() {
    if (!selectedEntity || datasetMode !== "sectivia") return;

    try {
      setDependencyLoading(true);
      setDependencyError("");
      setDependencyData(null);

      if (!localGraph) {
        throw new Error("Supply-chain graph is not loaded yet.");
      }

      const result = analyzeDependencies(
        localGraph,
        selectedEntity.id,
        dependencyDirection,
        Number(dependencyDepth)
      );

      setDependencyData(result);
    } catch (error) {
      setDependencyError(
        error instanceof Error ? error.message : "Dependency analysis failed"
      );
    } finally {
      setDependencyLoading(false);
    }
  }

  async function loadSimulationHistory() {
    try {
      const saved = localStorage.getItem("atmograph-simulation-history");
      setSimulationHistory(saved ? JSON.parse(saved) : []);
    } catch (error) {
      console.error("Could not load local simulation history:", error);
      setSimulationHistory([]);
    }
  }

  useEffect(() => {
    void loadSimulationHistory();
  }, []);

  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");

  async function clearSimulationHistory() {
    if (!window.confirm("Are you sure you want to clear all simulation history?")) return;
    localStorage.removeItem("atmograph-simulation-history");
    setSimulationHistory([]);
  }

  async function runSimulation() {
    try {
      setSimLoading(true);
      setSimError("");

      if (!localGraph) {
        throw new Error("Supply-chain graph is not loaded yet.");
      }

      const result = propagateDisruption(localGraph, sourceId, severity);
      setSimulation(result);

      const historyItem: SimulationHistoryItem = {
        id: Date.now(),
        source_entity: result.source_entity,
        initial_severity: result.initial_severity,
        total_affected: result.total_affected,
        high_risk: result.affected_entities.filter(e => e.risk_level === "High").length,
        medium_risk: result.affected_entities.filter(e => e.risk_level === "Medium").length,
        low_risk: result.affected_entities.filter(e => e.risk_level === "Low").length,
        timestamp: new Date().toISOString()
      };

      const saved = localStorage.getItem("atmograph-simulation-history");
      const previous: SimulationHistoryItem[] = saved ? JSON.parse(saved) : [];
      const updated = [historyItem, ...previous].slice(0, 50);

      localStorage.setItem("atmograph-simulation-history", JSON.stringify(updated));
      setSimulationHistory(updated);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  }

  async function loadData(mode: "synthetic" | "sectivia" = datasetMode) {
    try {
      setError("");
      setSelectedEntity(null);
      setSimulation(null);

      if (mode === "sectivia") {
        setRiskLoading(true);
        setRiskError("");

        try {
          const dataset = await loadDataset();
          const graph = buildGraph(dataset);
          const riskResult = calculateStructuralRisk(graph);

          setLocalDataset(dataset);
          setLocalGraph(graph);
          setRiskData(riskResult);
          setOverview(null);
          setEvents([]);

          setNodes(dataset.companies.map((company) => ({
            id: company.id,
            name: company.name,
            ticker: company.ticker ?? "",
            type: company.segment ?? company.sector ?? "Company",
            sector: company.sector ?? "Unknown",
            country: company.country ?? "Unknown"
          })));

          setEdges(graph.relationships.map((relationship) => ({
            source: relationship.supplier,
            target: relationship.customer
          })));
        } finally {
          setRiskLoading(false);
        }
      } else {
        const graph = buildSyntheticGraph();
        setLocalGraph(graph);
        setLocalDataset(null);
        setRiskData(null);
        setOverview({
          total_entities: graph.companies.size,
          total_connections: graph.relationships.length,
          active_disruptions: 0,
          high_risk_entities: 0,
          average_risk: 0,
          data_type: "synthetic_demo"
        });
        setEvents([]);
        setNodes(Array.from(graph.companies.values()).map(company => ({
          id: company.id,
          name: company.name,
          ticker: company.ticker,
          type: company.segment,
          sector: company.sector,
          country: company.country
        })));
        setEdges(graph.relationships.map(r => ({
          source: r.supplier,
          target: r.customer
        })));
      }
    } catch (error) {
      console.error("Dataset loading failed:", error);
      setError("Could not load the selected dataset. Check that the backend is running.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const cards = [
    {
      label: "Network Entities",
      value: datasetMode === "sectivia" ? (riskData?.total_companies ?? "Loading") : (overview?.total_entities ?? "—"),
      icon: Network
    },
    {
      label: "Network Connections",
      value: datasetMode === "sectivia" ? (riskData?.total_relationships ?? "Loading") : (overview?.total_connections ?? "—"),
      icon: Globe2
    },
    {
      label: "Active Disruptions",
      value: datasetMode === "sectivia" ? "Not available" : (overview?.active_disruptions ?? "—"),
      icon: AlertTriangle
    },
    {
      label: "High-Risk Entities",
      value: datasetMode === "sectivia" ? (riskData?.companies?.filter((company: { structural_level: string }) => company.structural_level === "High").length ?? "Loading") : (overview?.high_risk_entities ?? "—"),
      icon: ShieldCheck
    }
  ];

  const sectors = Array.from(new Set(
    nodes.map((node) => node.sector ?? node.type).filter(Boolean)
  )).sort();

  const countries = Array.from(new Set(
    nodes.map((node) => node.country).filter(Boolean)
  )).sort();

  const filteredCompanies = nodes.filter((node) => {
    const query = companySearch.trim().toLowerCase();

    const matchesSearch =
      !query ||
      node.name.toLowerCase().includes(query) ||
      (node.ticker ?? "").toLowerCase().includes(query);

    const matchesSector =
      sectorFilter === "All" ||
      (node.sector ?? node.type) === sectorFilter;

    const matchesCountry =
      countryFilter === "All" ||
      node.country === countryFilter;

    return matchesSearch && matchesSector && matchesCountry;
  });

  const positions: Record<string, { x: number; y: number }> = {
    PORT_EU: { x: 0, y: 100 },
    SUP_EU: { x: 220, y: 100 },
    FACTORY_US: { x: 440, y: 100 },
    WAREHOUSE_US: { x: 700, y: 220 },
    RETAIL_US: { x: 950, y: 220 },
    PORT_ASIA: { x: 0, y: 400 },
    SUP_JP: { x: 220, y: 400 },
    FACTORY_JP: { x: 440, y: 400 }
  };

  const connectedEntityIds = new Set(
    selectedEntity
      ? [
          selectedEntity.id,
          ...edges
            .filter((edge) => edge.source === selectedEntity.id || edge.target === selectedEntity.id)
            .flatMap((edge) => [edge.source, edge.target])
        ]
      : []
  );

  const graphNodesToRender =
    datasetMode === "sectivia" && !showFullNetwork
      ? nodes.filter((node) => connectedEntityIds.has(node.id))
      : nodes;

  const graphEdgesToRender =
    datasetMode === "sectivia" && !showFullNetwork && selectedEntity
      ? edges.filter(
          (edge) =>
            edge.source === selectedEntity.id ||
            edge.target === selectedEntity.id
        )
      : datasetMode === "sectivia" && !showFullNetwork
        ? []
        : edges;

  const isFocusedSectiviaGraph =
    datasetMode === "sectivia" && !showFullNetwork && !!selectedEntity;

  const focusedSupplierIds = graphEdgesToRender
    .filter((edge) => edge.target === selectedEntity?.id)
    .map((edge) => edge.source);

  const focusedCustomerIds = graphEdgesToRender
    .filter((edge) => edge.source === selectedEntity?.id)
    .map((edge) => edge.target);

  const focusedGraphHeight = Math.max(
    550,
    Math.max(focusedSupplierIds.length, focusedCustomerIds.length) * 85 + 220
  );

  const focusedCenterY = focusedGraphHeight / 2;

  const focusedPositions: Record<string, { x: number; y: number }> = {
    ...(selectedEntity
      ? { [selectedEntity.id]: { x: 550, y: focusedCenterY } }
      : {})
  };

  focusedSupplierIds.forEach((id, index) => {
    focusedPositions[id] = {
      x: 100,
      y: focusedCenterY +
        (index - (focusedSupplierIds.length - 1) / 2) * 85
    };
  });

  focusedCustomerIds.forEach((id, index) => {
    focusedPositions[id] = {
      x: 1050,
      y: focusedCenterY +
        (index - (focusedCustomerIds.length - 1) / 2) * 85
    };
  });

  const flowNodes: Node[] = graphNodesToRender.map((node, index) => {
    const isSelected = selectedEntity?.id === node.id;
    const isConnected = connectedEntityIds.has(node.id);
    const isAffected = simulation?.affected_entities.some((item) => item.id === node.id);

    return {
      id: node.id,
      position: isFocusedSectiviaGraph
        ? focusedPositions[node.id] ?? { x: 550, y: focusedCenterY }
        : positions[node.id] ?? {
            x: (index % 12) * 220,
            y: Math.floor(index / 12) * 150
          },
      data: { label: `${node.name} (${node.country})` },
      style: {
        background: isSelected ? "#164e63" : "#0f172a",
        color: isConnected || !selectedEntity ? "#e2e8f0" : "#64748b",
        opacity: !selectedEntity || isConnected ? 1 : 0.3,
        border: isSelected
          ? "3px solid #22d3ee"
          : isAffected
            ? "2px solid #f97316"
            : isConnected
              ? "2px solid #22d3ee"
              : "1px solid #334155",
        borderRadius: "10px",
        padding: "14px",
        width: 175,
        fontSize: "12px"
      }
    };
  });

  const flowEdges: Edge[] = graphEdgesToRender.map((edge, index) => {
    const isConnected = selectedEntity
      ? edge.source === selectedEntity.id || edge.target === selectedEntity.id
      : false;

    return {
      id: `connection-${index}`,
      source: edge.source,
      target: edge.target,
      animated: selectedEntity ? isConnected : true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isConnected || !selectedEntity ? "#22d3ee" : "#334155"
      },
      style: {
        stroke: selectedEntity
          ? isConnected ? "#22d3ee" : "#334155"
          : "#22d3ee",
        strokeWidth: isConnected ? 4 : 2,
        opacity: selectedEntity && !isConnected ? 0.2 : 1
      }
    };
  });

  const dependencyLevelCounts = dependencyData?.companies.reduce<Record<number, number>>(
    (counts, company) => {
      counts[company.level] = (counts[company.level] ?? 0) + 1;
      return counts;
    },
    {}
  ) ?? {};

  const dependencyGraphHeight = Math.max(
    650,
    Math.max(0, ...Object.values(dependencyLevelCounts)) * 90 + 180
  );

  const dependencyFlowNodes: Node[] = dependencyData
    ? [
        {
          id: dependencyData.source.id,
          position: { x: dependencyData.direction === "upstream" ? 850 : 150, y: 210 },
          data: { label: dependencyData.source.name + " (Selected)" },
          style: {
            background: "#164e63",
            color: "#ffffff",
            border: "2px solid #22d3ee",
            borderRadius: "10px",
            padding: "14px",
            width: 190
          }
        },
        ...dependencyData.companies.map((company, index) => {
          const sameLevel = dependencyData.companies.filter(
            (item) => item.level === company.level
          );
          const indexAtLevel = sameLevel.findIndex(
            (item) => item.id === company.id
          );
          const x = dependencyData.direction === "upstream"
            ? 850 - company.level * 300
            : 150 + company.level * 300;

          return {
            id: company.id,
            position: {
              x,
              y: dependencyGraphHeight / 2 +
                (indexAtLevel - (sameLevel.length - 1) / 2) * 90
            },
            data: {
              label: `${company.name}${company.ticker ? " (" + company.ticker + ")" : ""}`
            },
            style: {
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid #0891b2",
              borderRadius: "10px",
              padding: "12px",
              width: 190,
              fontSize: "11px"
            }
          };
        })
      ]
    : [];

  const dependencyFlowEdges: Edge[] = dependencyData
    ? dependencyData.connections.map((connection, index) => ({
        id: `dependency-${index}-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#22d3ee"
        },
        style: {
          stroke: "#22d3ee",
          strokeWidth: 2
        },
        label: `Level ${connection.level}`,
        labelStyle: { fill: "#94a3b8", fontSize: 10 }
      }))
    : [];


  const impactLevelCounts = impactData?.affected_companies.reduce<Record<number, number>>(
    (counts, company) => {
      counts[company.level] = (counts[company.level] ?? 0) + 1;
      return counts;
    },
    {}
  ) ?? {};

  const impactGraphHeight = Math.max(
    500,
    Math.max(0, ...Object.values(impactLevelCounts)) * 85 + 160
  );

  const impactFlowNodes: Node[] = impactData
    ? [
        {
          id: impactData.source.id,
          position: { x: 100, y: impactGraphHeight / 2 },
          data: { label: `${impactData.source.name} (Disruption Source)` },
          style: {
            background: "#78350f",
            color: "#ffffff",
            border: "2px solid #f59e0b",
            borderRadius: "10px",
            padding: "14px",
            width: 210
          }
        },
        ...impactData.affected_companies.map((company) => {
          const sameLevel = impactData.affected_companies.filter(
            (item) => item.level === company.level
          );
          const indexAtLevel = sameLevel.findIndex(
            (item) => item.id === company.id
          );

          const background =
            company.impact_level === "High" ? "#7f1d1d" :
            company.impact_level === "Medium" ? "#78350f" : "#14532d";

          const border =
            company.impact_level === "High" ? "#ef4444" :
            company.impact_level === "Medium" ? "#f59e0b" : "#22c55e";

          return {
            id: company.id,
            position: {
              x: 100 + company.level * 300,
              y: impactGraphHeight / 2 +
                (indexAtLevel - (sameLevel.length - 1) / 2) * 85
            },
            data: {
              label: `${company.name}${company.ticker ? ` (${company.ticker})` : ""} · ${company.impact_score}`
            },
            style: {
              background,
              color: "#ffffff",
              border: `1px solid ${border}`,
              borderRadius: "10px",
              padding: "11px",
              width: 210,
              fontSize: "11px"
            }
          };
        })
      ]
    : [];

  const impactFlowEdges: Edge[] = impactData
    ? impactData.connections.map((connection, index) => ({
        id: `impact-${index}-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f59e0b"
        },
        style: {
          stroke: "#f59e0b",
          strokeWidth: 2
        },
        label: `Level ${connection.level}`,
        labelStyle: { fill: "#fbbf24", fontSize: 10 }
      }))
    : [];

  return (
    <main className="flex h-screen min-h-0 overflow-hidden bg-[#08111f]">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-5 md:flex">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <Network size={23} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-cyan-400">ATMOGRAPH</h2>
              <p className="text-xs text-slate-500">Supply Chain Intelligence</p>
            </div>
          </div>
        </div>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <nav className="flex flex-1 flex-col gap-2">
          {[
            { id: "overview", label: "Overview", icon: Activity, target: "overview-section" },
            { id: "companies", label: "Company Explorer", icon: Network, target: "company-explorer-section" },
            { id: "risk", label: "Risk Intelligence", icon: ShieldCheck, target: "risk-intelligence-section" },
            { id: "dependencies", label: "Dependency Explorer", icon: Globe2, target: "dependency-explorer-section" },
            { id: "impact", label: "Impact Analysis", icon: AlertTriangle, target: "impact-analysis-section" },
            { id: "history", label: "Simulation History", icon: Activity, target: "simulation-history-section" }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveWorkspace(item.id as typeof activeWorkspace);
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                  activeWorkspace === item.id
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
          AtmoGraph · Intelligence Platform
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">
              ATMOGRAPH
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Global Supply Chain Intelligence Platform
            </p>
          </div>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1600px] flex-1 space-y-8 overflow-y-auto px-6 py-8">
        <div className={activeWorkspace === "overview" ? "contents" : "hidden"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Executive Overview</h2>
            <p className="mt-1 text-sm text-slate-400">
              Supply chain network status and disruption intelligence
            </p>
          </div>
          <span className="rounded-full border border-cyan-800 bg-cyan-950 px-3 py-1 text-xs text-cyan-300">
            SYNTHETIC DEMO DATA
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <Icon className="text-cyan-400" size={21} />
                </div>
                <p className="mt-5 text-3xl font-bold">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>


        <div className={`rounded-xl border border-cyan-900 bg-slate-900 p-6 ${datasetMode === "synthetic" ? "" : "hidden"}`}>
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-cyan-400">
              Disruption Simulator
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Test how a supply-chain disruption propagates through the network.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Disruption Source
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Severity: {severity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="mt-3 w-full accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={runSimulation}
                disabled={simLoading || nodes.length === 0}
                className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {simLoading ? "Simulating..." : "Run Simulation"}
              </button>
            </div>
          </div>

          {simError && (
            <p className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
              {simError}
            </p>
          )}

          {simulation && (
            <div className="mt-6 border-t border-slate-700 pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">Simulation Results</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Source: {simulation.source_entity} · Severity: {simulation.initial_severity}%
                  </p>
                </div>
                <span className="rounded-lg bg-cyan-950 px-4 py-2 text-cyan-300">
                  {simulation.total_affected} affected entities
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr className="border-b border-slate-700">
                      <th className="p-3">Entity</th>
                      <th className="p-3">Risk Score</th>
                      <th className="p-3">Risk Level</th>
                      <th className="p-3">Distance</th>
                      <th className="p-3">Estimated Delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.affected_entities.map((item) => (
                      <tr key={item.id} className="border-b border-slate-800">
                        <td className="p-3">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.type} · {item.country}
                          </p>
                        </td>
                        <td className="p-3">{item.risk_score}%</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-1 text-xs ${
                            item.risk_level === "High"
                              ? "bg-red-950 text-red-300"
                              : item.risk_level === "Medium"
                                ? "bg-amber-950 text-amber-300"
                                : "bg-blue-950 text-blue-300"
                          }`}>
                            {item.risk_level}
                          </span>
                        </td>
                        <td className="p-3">{item.distance} hops</td>
                        <td className="p-3">{item.estimated_delay_days} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-amber-400">
                Illustrative NetworkX simulation using synthetic data. Risk and delay values are not trained AI forecasts.
              </p>
            </div>
          )}
        </div>


        {simulation && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-cyan-400">
              Risk Analytics
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Analysis of the latest disruption simulation
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Affected Entities",
                  value: simulation.affected_entities.length
                },
                {
                  label: "High Risk",
                  value: simulation.affected_entities.filter(
                    item => item.risk_level === "High"
                  ).length
                },
                {
                  label: "Medium Risk",
                  value: simulation.affected_entities.filter(
                    item => item.risk_level === "Medium"
                  ).length
                },
                {
                  label: "Low Risk",
                  value: simulation.affected_entities.filter(
                    item => item.risk_level === "Low"
                  ).length
                }
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-4 font-semibold">Risk Distribution</h4>
                {[
                  { label: "High", color: "bg-red-500" },
                  { label: "Medium", color: "bg-amber-400" },
                  { label: "Low", color: "bg-blue-500" }
                ].map(level => {
                  const count = simulation.affected_entities.filter(
                    item => item.risk_level === level.label
                  ).length;
                  const total = simulation.affected_entities.length;
                  const percentage = total ? (count / total) * 100 : 0;

                  return (
                    <div key={level.label} className="mb-4">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{level.label}</span>
                        <span>{count} entities ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full ${level.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h4 className="mb-4 font-semibold">Most Affected Entities</h4>
                <div className="space-y-3">
                  {simulation.affected_entities.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                      <div className="flex justify-between gap-3">
                        <span className="text-sm">
                          {index + 1}. {item.name}
                        </span>
                        <span className="text-sm font-semibold text-amber-400">
                          {item.risk_score}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{ width: `${item.risk_score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Analytics are calculated from the current synthetic simulation,
              not from trained AI predictions or live supply-chain data.
            </p>
          </section>
        )}

        </div>

        <section className={`mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 ${activeWorkspace === "history" ? "" : "hidden"}`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400">Simulation History</h3>
              <p className="mt-1 text-sm text-slate-400">Your recent disruption simulation runs</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-cyan-950 px-3 py-2 text-sm text-cyan-300">
                {simulationHistory.length} runs
              </span>
              <button
                onClick={clearSimulationHistory}
                disabled={simulationHistory.length === 0}
                className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-40"
              >
                Clear History
              </button>
            </div>
          </div>

          {simulationHistory.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              No simulations yet. Run your first simulation to create a history record.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-slate-700">
                    <th className="p-3">Time</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Affected</th>
                    <th className="p-3">High</th>
                    <th className="p-3">Medium</th>
                    <th className="p-3">Low</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationHistory.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800">
                      <td className="p-3 text-slate-400">{item.timestamp}</td>
                      <td className="p-3">{item.source_entity}</td>
                      <td className="p-3">{item.initial_severity}%</td>
                      <td className="p-3">{item.total_affected}</td>
                      <td className="p-3 text-red-400">{item.high_risk}</td>
                      <td className="p-3 text-amber-400">{item.medium_risk}</td>
                      <td className="p-3 text-blue-400">{item.low_risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Simulation history is stored in the SQLite database and remains available after page reloads.
          </p>
        </section>

        <div className={["companies", "risk", "dependencies", "impact"].includes(activeWorkspace) ? "contents" : "hidden"}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Network className="text-cyan-400" size={20} />
                Supply Chain Intelligence
              </h3>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDatasetMode("synthetic");
                    setSourceId("PORT_EU");
                    void loadData("synthetic");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    datasetMode === "synthetic"
                      ? "bg-cyan-600 text-white"
                      : "border border-slate-700 text-slate-300"
                  }`}
                >
                  Synthetic Demo
                </button>

                <button
                  onClick={() => {
                    setDatasetMode("sectivia");
                    void loadData("sectivia");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    datasetMode === "sectivia"
                      ? "bg-cyan-600 text-white"
                      : "border border-slate-700 text-slate-300"
                  }`}
                >
                  Sectivia Dataset
                </button>
              </div>
            </div>

            {activeWorkspace === "risk" && datasetMode === "sectivia" && (
              <section className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-5">
                <div className="mb-5">
                  <h3 className="text-xl font-semibold text-cyan-400">
                    Risk Intelligence Dashboard
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Structural vulnerability analysis based on documented supplier and customer relationships.
                  </p>
                </div>

                {riskLoading ? (
                  <p className="rounded-lg bg-slate-900 p-6 text-center text-sm text-slate-400">
                    Analysing company relationships...
                  </p>
                ) : riskError ? (
                  <p className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
                    {riskError}. Check that the backend risk-analysis endpoint is running.
                  </p>
                ) : !riskData ? (
                  <p className="rounded-lg bg-slate-900 p-6 text-center text-sm text-slate-400">
                    Risk analysis data is not available yet.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs text-slate-400">Companies analysed</p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          {riskData.total_companies}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs text-slate-400">Relationships analysed</p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          {riskData.total_relationships}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs text-slate-400">High structural vulnerability</p>
                        <p className="mt-2 text-2xl font-bold text-red-400">
                          {riskData.companies.filter(
                            (company) => company.structural_level === "High"
                          ).length}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {(["High", "Medium", "Low"] as const).map((level) => {
                        const count = riskData.companies.filter(
                          (company) => company.structural_level === level
                        ).length;

                        const color =
                          level === "High"
                            ? "text-red-400"
                            : level === "Medium"
                              ? "text-amber-400"
                              : "text-emerald-400";

                        return (
                          <div key={level} className="rounded-lg border border-slate-800 p-3">
                            <p className="text-xs text-slate-400">
                              {level} vulnerability
                            </p>
                            <p className={`mt-1 text-xl font-bold ${color}`}>
                              {count} companies
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6">
                      <h4 className="mb-3 text-lg font-semibold text-white">
                        Top 10 Structurally Vulnerable Companies
                      </h4>

                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-900 text-xs text-slate-400">
                            <tr>
                              <th className="p-3">Rank</th>
                              <th className="p-3">Company</th>
                              <th className="p-3">Sector</th>
                              <th className="p-3">Suppliers</th>
                              <th className="p-3">Customers</th>
                              <th className="p-3">Index</th>
                              <th className="p-3">Level</th>
                            </tr>
                          </thead>
                          <tbody>
                            {riskData.companies.slice(0, 10).map((company, index) => (
                              <tr
                                key={company.id}
                                className="border-t border-slate-800 hover:bg-slate-900"
                              >
                                <td className="p-3 text-slate-400">{index + 1}</td>
                                <td className="p-3 font-medium text-white">
                                  {company.name}
                                  <p className="text-xs text-slate-500">
                                    {company.ticker || company.id}
                                  </p>
                                </td>
                                <td className="p-3 text-slate-300">{company.sector}</td>
                                <td className="p-3">{company.supplier_count}</td>
                                <td className="p-3">{company.customer_count}</td>
                                <td className="p-3 font-semibold text-cyan-300">
                                  {company.structural_vulnerability_index.toFixed(2)}
                                </td>
                                <td className={`p-3 font-medium ${
                                  company.structural_level === "High"
                                    ? "text-red-400"
                                    : company.structural_level === "Medium"
                                      ? "text-amber-400"
                                      : "text-emerald-400"
                                }`}>
                                  {company.structural_level}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-4">
                      <h4 className="font-semibold text-cyan-300">
                        Scoring methodology
                      </h4>
                      <p className="mt-2 text-sm text-slate-300">
                        {riskData.method}. Supplier scarcity: 30%, downstream exposure: 30%,
                        network centrality: 25%, customer reach: 15%.
                      </p>

                      <p className="mt-3 text-xs text-slate-400">
                        This is a heuristic structural vulnerability index, not a probability
                        of disruption or a trained machine-learning prediction.
                      </p>

                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
                        {riskData.limitations.map((limitation, index) => (
                          <li key={index}>{limitation}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      Dataset attribution: Sectivia · CC BY 4.0 · https://sectivia.com
                    </p>
                  </>
                )}
              </section>
            )}

            {activeWorkspace === "companies" && datasetMode === "sectivia" && (
              <section className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-cyan-400">
                      Company Explorer
                    </h4>
                    <p className="mt-1 text-sm text-slate-400">
                      Search and discover companies in the Sectivia supply-chain dataset.
                    </p>
                  </div>
                  <span className="rounded-lg bg-cyan-950 px-3 py-2 text-sm text-cyan-300">
                    {filteredCompanies.length} of {nodes.length} companies
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    placeholder="Search company name or ticker..."
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  />

                  <select
                    value={sectorFilter}
                    onChange={(event) => setSectorFilter(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  >
                    <option value="All">All sectors</option>
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>

                  <select
                    value={countryFilter}
                    onChange={(event) => setCountryFilter(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  >
                    <option value="All">All countries</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-800">
                  {filteredCompanies.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-400">
                      No companies match your search or filters.
                    </p>
                  ) : (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => { setSelectedEntity(company); setShowFullNetwork(false); }}
                        className={`flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 text-left transition hover:bg-slate-800 ${
                          selectedEntity?.id === company.id
                            ? "bg-cyan-950/60"
                            : "bg-transparent"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-100">
                            {company.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {company.ticker || company.id} · {company.country}
                          </p>
                        </div>
                        <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-cyan-300">
                          {company.sector ?? company.type}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Select a company to highlight its connected suppliers and customers in the graph below.
                </p>
              </section>
            )}

            {activeWorkspace === "companies" && (
              <>
            {datasetMode === "sectivia" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  {showFullNetwork
                    ? "Viewing the complete Sectivia network."
                    : selectedEntity
                      ? `Focused view: ${selectedEntity.name} and its direct connections.`
                      : "Select a company above to explore its direct supply-chain connections."}
                </p>
                <button
                  onClick={() => setShowFullNetwork((current) => !current)}
                  className="rounded-lg border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-950"
                >
                  {showFullNetwork ? "Show Focused View" : "Show Full Network"}
                </button>
              </div>
            )}

            <div
              style={{ height: `${isFocusedSectiviaGraph ? focusedGraphHeight : 550}px` }}
              className="relative mt-6 overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
            >
              {datasetMode === "sectivia" && flowNodes.length === 0 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                  <p className="max-w-md text-sm text-slate-400">
                    Select a company in Company Explorer to display its direct suppliers and customers, or choose Show Full Network.
                  </p>
                </div>
              )}
              <ReactFlow
                key={flowNodes.length}
                nodes={flowNodes}
                edges={flowEdges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={2}
                onNodeClick={(event, node) => {
                  const entity = nodes.find((item) => item.id === node.id);
                  setSelectedEntity(entity ?? null);
                  setShowFullNetwork(false);
                }}
              >
                <Background color="#334155" gap={20} />
                <Controls />
                <MiniMap
                  nodeColor="#22d3ee"
                  maskColor="rgba(2, 6, 23, 0.7)"
                />
              </ReactFlow>
            </div>
            {selectedEntity && (
              <div className="mt-5 rounded-lg border border-cyan-800 bg-slate-950 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-cyan-400">
                    Entity Details
                  </h4>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">Entity Name</p>
                    <p className="font-medium">{selectedEntity.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Entity ID</p>
                    <p className="font-medium">{selectedEntity.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Type</p>
                    <p className="font-medium">{selectedEntity.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Country</p>
                    <p className="font-medium">{selectedEntity.country}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="text-sm font-semibold text-slate-200">Connections</p>
                  <p className="mt-2 text-xs text-slate-400">Suppliers / Incoming</p>
                  <p className="mt-1 text-sm">
                    {edges.filter((edge) => edge.target === selectedEntity.id)
                      .map((edge) => nodes.find((item) => item.id === edge.source)?.name)
                      .filter(Boolean).join(", ") || "No incoming connections"}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">Customers / Outgoing</p>
                  <p className="mt-1 text-sm">
                    {edges.filter((edge) => edge.source === selectedEntity.id)
                      .map((edge) => nodes.find((item) => item.id === edge.target)?.name)
                      .filter(Boolean).join(", ") || "No outgoing connections"}
                  </p>
                </div>

                {datasetMode === "sectivia" && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-cyan-400">
                      Multi-Level Dependency Explorer
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Trace documented suppliers or customers across the network.
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">
                          Direction
                        </label>
                        <select
                          value={dependencyDirection}
                          onChange={(event) =>
                            setDependencyDirection(
                              event.target.value as "upstream" | "downstream"
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                        >
                          <option value="upstream">Upstream — Suppliers</option>
                          <option value="downstream">Downstream — Customers</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-400">
                          Relationship Depth
                        </label>
                        <select
                          value={dependencyDepth}
                          onChange={(event) => setDependencyDepth(event.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                        >
                          <option value="1">1 Level</option>
                          <option value="2">2 Levels</option>
                          <option value="3">3 Levels</option>
                          <option value="4">4 Levels</option>
                          <option value="5">5 Levels</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={exploreDependencies}
                      disabled={dependencyLoading}
                      className="mt-3 w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                    >
                      {dependencyLoading ? "Analysing Network..." : "Explore Dependencies"}
                    </button>

                    {dependencyError && (
                      <p className="mt-3 text-sm text-red-400">
                        {dependencyError}
                      </p>
                    )}

                    {dependencyData?.source.id === selectedEntity.id && (
                      <div className="mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-slate-400">
                              Companies Found
                            </p>
                            <p className="mt-1 text-2xl font-bold text-cyan-400">
                              {dependencyData.total_companies_found}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-slate-400">
                              Connections Found
                            </p>
                            <p className="mt-1 text-2xl font-bold text-cyan-400">
                              {dependencyData.total_connections_found}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          {dependencyData.companies.length === 0 ? (
                            <p className="text-sm text-slate-400">
                              No documented companies found in this direction
                              within the selected depth.
                            </p>
                          ) : (
                            Array.from(
                              new Set(
                                dependencyData.companies.map((company) => company.level)
                              )
                            ).sort((a, b) => a - b).map((level) => (
                              <div key={level}>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                                  Level {level}
                                </p>
                                <div className="space-y-2">
                                  {dependencyData.companies
                                    .filter((company) => company.level === level)
                                    .map((company) => (
                                      <button
                                        key={company.id}
                                        onClick={() => {
                                          const match = nodes.find(
                                            (node) => node.id === company.id
                                          );
                                          if (match) {
                                            setSelectedEntity(match);
                                            setShowFullNetwork(false);
                                            setDependencyData(null);
                                          }
                                        }}
                                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3 text-left hover:border-cyan-700"
                                      >
                                        <span>
                                          <span className="block text-sm font-medium text-slate-100">
                                            {company.name}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {company.ticker || company.sector || company.country}
                                          </span>
                                        </span>
                                        <span className="text-xs text-cyan-400">
                                          Inspect →
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-5 border-t border-slate-800 pt-4">
                          <h5 className="mb-2 text-sm font-semibold text-cyan-300">
                            Visual Dependency Network
                          </h5>
                          <p className="mb-3 text-xs text-slate-400">
                            Follow the directional arrows between the selected company
                            and its documented suppliers or customers.
                          </p>
                          <div
                            style={{ height: `${dependencyGraphHeight}px` }}
                            className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
                          >
                            <ReactFlow
                              key={`dependency-${dependencyData.source.id}-${dependencyData.direction}-${dependencyData.depth}`}
                              nodes={dependencyFlowNodes}
                              edges={dependencyFlowEdges}
                              fitView
                              fitViewOptions={{ padding: 0.2 }}
                              minZoom={0.1}
                              maxZoom={2}
                              onNodeClick={(event, node) => {
                                const entity = nodes.find(
                                  (item) => item.id === node.id
                                );
                                if (entity) {
                                  setSelectedEntity(entity);
                                  setShowFullNetwork(false);
                                }
                              }}
                            >
                              <Background color="#334155" gap={20} />
                              <Controls />
                              <MiniMap
                                nodeColor="#22d3ee"
                                maskColor="rgba(2, 6, 23, 0.7)"
                              />
                            </ReactFlow>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Based on documented Sectivia relationships · CC BY 4.0.
                          Results represent network connections, not verified
                          purchase volumes or live dependencies.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {datasetMode === "sectivia" && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-amber-400">
                      Supply-Chain Impact Analysis
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Explore how a disruption could propagate through documented downstream relationships.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="rounded-lg bg-slate-900 p-3">
                        <span className="text-xs text-slate-400">Severity: {impactSeverity}%</span>
                        <input type="range" min="0" max="100"
                          value={impactSeverity}
                          onChange={(e) => setImpactSeverity(Number(e.target.value))}
                          className="mt-2 w-full accent-amber-500" />
                      </label>
                      <label className="rounded-lg bg-slate-900 p-3">
                        <span className="text-xs text-slate-400">Propagation depth</span>
                        <select value={impactDepth}
                          onChange={(e) => setImpactDepth(e.target.value)}
                          className="mt-2 w-full rounded bg-slate-950 p-2 text-sm text-white">
                          {[1, 2, 3, 4, 5].map((n) =>
                            <option key={n} value={String(n)}>{n} levels</option>
                          )}
                        </select>
                      </label>
                    </div>

                    <button onClick={runImpactAnalysis} disabled={impactLoading}
                      className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50">
                      {impactLoading ? "Analysing Impact..." : "Run Impact Analysis"}
                    </button>

                    {impactError && <p className="mt-3 text-sm text-red-400">{impactError}</p>}

                    {impactData?.source.id === selectedEntity.id && (
                      <div className="mt-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-slate-400">Affected companies</p>
                            <p className="text-2xl font-bold text-amber-400">{impactData.total_affected}</p>
                          </div>
                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-slate-400">Connections</p>
                            <p className="text-2xl font-bold text-amber-400">{impactData.total_connections}</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {(["High", "Medium", "Low"] as const).map((level) => {
                            const count = impactData.affected_companies.filter(
                              (company) => company.impact_level === level
                            ).length;
                            const color = level === "High" ? "text-red-400" :
                              level === "Medium" ? "text-amber-400" : "text-emerald-400";
                            return (
                              <div key={level} className="rounded-lg bg-slate-900 p-3 text-center">
                                <p className="text-xs text-slate-400">{level}</p>
                                <p className={`text-xl font-bold ${color}`}>{count}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 space-y-2">
                          {impactData.level_summary.map((item) => (
                            <div key={item.level} className="flex justify-between rounded bg-slate-900 p-2 text-sm">
                              <span className="text-amber-300">Level {item.level}</span>
                              <span className="text-slate-300">{item.affected_companies} companies</span>
                            </div>
                          ))}
                        </div>

                        <h5 className="mb-2 mt-4 text-sm font-semibold text-slate-200">
                          Affected companies
                        </h5>
                        <div className="max-h-80 space-y-2 overflow-y-auto">
                          {impactData.affected_companies.map((company) => (
                            <div key={company.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm text-slate-100">{company.name}</p>
                                <p className="text-xs text-slate-400">
                                  {company.ticker || company.sector || company.country} · Level {company.level}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold">{company.impact_score.toFixed(1)}</p>
                                <p className="text-xs text-amber-400">{company.impact_level}</p>
                              </div>
                            </div>
                          ))}
                          {impactData.affected_companies.length === 0 && (
                            <p className="text-sm text-slate-400">No downstream companies found.</p>
                          )}
                        </div>

                        <div className="mt-5 border-t border-slate-800 pt-4">
                          <h5 className="mb-2 text-sm font-semibold text-amber-300">
                            Visual Impact Propagation Network
                          </h5>
                          <p className="mb-3 text-xs text-slate-400">
                            Follow how the selected company's disruption propagates
                            through downstream companies. Node colors indicate illustrative impact levels.
                          </p>

                          <div
                            style={{ height: `${impactGraphHeight}px` }}
                            className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
                          >
                            <ReactFlow
                              key={`impact-${impactData.source.id}-${impactData.initial_severity}-${impactData.depth}`}
                              nodes={impactFlowNodes}
                              edges={impactFlowEdges}
                              fitView
                              fitViewOptions={{ padding: 0.2 }}
                              minZoom={0.1}
                              maxZoom={2}
                              onNodeClick={(event, node) => {
                                const entity = nodes.find(
                                  (item) => item.id === node.id
                                );

                                if (entity) {
                                  setSelectedEntity(entity);
                                  setShowFullNetwork(false);
                                }
                              }}
                            >
                              <Background color="#334155" gap={20} />
                              <Controls />
                              <MiniMap
                                nodeColor={(node) => {
                                  if (node.id === impactData.source.id) return "#f59e0b";

                                  const company = impactData.affected_companies.find(
                                    (item) => item.id === node.id
                                  );

                                  if (company?.impact_level === "High") return "#ef4444";
                                  if (company?.impact_level === "Medium") return "#f59e0b";
                                  return "#22c55e";
                                }}
                                maskColor="rgba(2, 6, 23, 0.7)"
                              />
                            </ReactFlow>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs">
                            <span className="text-red-400">● High impact</span>
                            <span className="text-amber-400">● Medium impact</span>
                            <span className="text-emerald-400">● Low impact</span>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Illustrative impact scores, not measured losses or trained ML predictions.
                          Based on documented Sectivia relationships · CC BY 4.0.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {datasetMode === "sectivia" && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-cyan-400">
                      Structural Risk Intelligence
                    </h4>

                    {(() => {
                      const companyRisk = riskData?.companies.find(
                        (company) => company.id === selectedEntity.id
                      );

                      if (!companyRisk) {
                        return (
                          <p className="mt-2 text-sm text-slate-400">
                            Structural risk data is not available for this company.
                          </p>
                        );
                      }

                      const metrics = [
                        {
                          label: "Supplier Scarcity",
                          value: companyRisk.supplier_scarcity_score
                        },
                        {
                          label: "Downstream Exposure",
                          value: companyRisk.downstream_exposure_score
                        },
                        {
                          label: "Network Centrality",
                          value: companyRisk.network_centrality_score
                        },
                        {
                          label: "Customer Reach",
                          value: companyRisk.customer_reach_score
                        }
                      ];

                      return (
                        <>
                          <div className="mt-3 rounded-lg border border-cyan-900 bg-slate-900 p-4">
                            <p className="text-xs text-slate-400">
                              Structural Vulnerability Index
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <span className="text-3xl font-bold text-cyan-400">
                                {companyRisk.structural_vulnerability_index}
                              </span>
                              <span className="rounded-full border border-slate-700 px-3 py-1 text-sm">
                                {companyRisk.structural_level}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-900 p-3">
                              <p className="text-xs text-slate-400">Direct Suppliers</p>
                              <p className="mt-1 text-xl font-semibold">
                                {companyRisk.supplier_count}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-900 p-3">
                              <p className="text-xs text-slate-400">Direct Customers</p>
                              <p className="mt-1 text-xl font-semibold">
                                {companyRisk.customer_count}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 space-y-3">
                            {metrics.map((metric) => (
                              <div key={metric.label}>
                                <div className="mb-1 flex justify-between gap-3 text-xs">
                                  <span className="text-slate-400">{metric.label}</span>
                                  <span className="font-semibold text-slate-200">
                                    {metric.value.toFixed(2)}
                                  </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-cyan-400"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, metric.value))}%`
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <p className="mt-3 text-xs text-slate-500">
                            Heuristic structural indicators based on documented
                            network relationships, not failure probabilities.
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-400">Simulation Risk</p>
                  {simulation?.affected_entities.find(
                    (item) => item.id === selectedEntity.id
                  ) ? (
                    <p className="mt-1 font-semibold text-amber-400">
                      {simulation.affected_entities.find((item) => item.id === selectedEntity.id)?.risk_score}% · {simulation.affected_entities.find((item) => item.id === selectedEntity.id)?.risk_level} Risk · Estimated delay: {simulation.affected_entities.find((item) => item.id === selectedEntity.id)?.estimated_delay_days} days
                    </p>
                  ) : simulation?.source_entity === selectedEntity.id ? (
                    <p className="mt-1 font-semibold text-cyan-400">
                      Disruption Source · Severity: {simulation.initial_severity}%
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      No risk calculated for this entity yet. Run a simulation to check.
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="mt-5 text-xs text-slate-500">
              Interactive supply-chain network. Drag entities, zoom and follow directional connections.
            </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Activity className="text-cyan-400" size={20} />
              Structural Risk Snapshot
            </h3>
            <p className="mt-6 text-5xl font-bold text-amber-400">
              {riskData && riskData.companies.length > 0
                ? `${(
                    riskData.companies.reduce(
                      (sum, company) =>
                        sum + company.structural_vulnerability_index,
                      0
                    ) / riskData.companies.length
                  ).toFixed(2)}`
                : "Loading"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Average Structural Vulnerability Index / 100
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{
                  width: `${riskData && riskData.companies.length > 0
                    ? riskData.companies.reduce(
                        (sum, company) =>
                          sum + company.structural_vulnerability_index,
                        0
                      ) / riskData.companies.length
                    : 0}%`
                }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Based on {riskData?.total_companies ?? 0} companies in the Sectivia dataset.
              This is a structural indicator, not a disruption probability.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-5 text-lg font-semibold">
            Disruption Intelligence Feed
          </h3>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {event.location} · {event.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{event.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs ${event.severity === "High" ? "bg-red-950 text-red-300" : "bg-amber-950 text-amber-300"}`}>
                    {event.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            All displayed events are synthetic examples, not live news.
          </p>
        </div>
              </div>

</section>
      </div>
    </main>
  );
}
