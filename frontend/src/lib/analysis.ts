export type Company = {
  id: string;
  ticker: string;
  name: string;
  exchange?: string;
  country: string;
  sector: string;
  segment: string;
  listed?: boolean;
};

export type Relationship = {
  supplier: string;
  customer: string;
  supplierTicker?: string;
  customerTicker?: string;
  sector: string;
  cross: boolean;
  what_en: string;
  source: string;
  url: string;
};

export type SupplyChainDataset = {
  name: string;
  description: string;
  url: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  caveat: string;
  counts: Record<string, number>;
  sectors: { id: string; name: string }[];
  segments: { id: string; sector: string; name: string }[];
  companies: Company[];
  relations: Relationship[];
};

export type Graph = {
  companies: Map<string, Company>;
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  relationships: Relationship[];
};

export function buildSyntheticGraph(): Graph {
  const companies: Company[] = [
    { id: "PORT_EU", ticker: "", name: "European Port", country: "Germany", sector: "Logistics", segment: "Port" },
    { id: "SUP_EU", ticker: "", name: "Euro Components", country: "Germany", sector: "Manufacturing", segment: "Supplier" },
    { id: "FACTORY_US", ticker: "", name: "North American Factory", country: "USA", sector: "Manufacturing", segment: "Manufacturer" },
    { id: "WAREHOUSE_US", ticker: "", name: "Central Warehouse", country: "USA", sector: "Logistics", segment: "Warehouse" },
    { id: "RETAIL_US", ticker: "", name: "Electronics Retailer", country: "USA", sector: "Retail", segment: "Retailer" },
    { id: "SUP_JP", ticker: "", name: "Asia Materials", country: "Japan", sector: "Manufacturing", segment: "Supplier" },
    { id: "FACTORY_JP", ticker: "", name: "Asia Manufacturing", country: "Japan", sector: "Manufacturing", segment: "Manufacturer" },
    { id: "PORT_ASIA", ticker: "", name: "Asian Export Port", country: "Japan", sector: "Logistics", segment: "Port" }
  ];
  const pairs: [string, string][] = [
    ["PORT_EU", "SUP_EU"], ["SUP_EU", "FACTORY_US"],
    ["FACTORY_US", "WAREHOUSE_US"], ["WAREHOUSE_US", "RETAIL_US"],
    ["PORT_ASIA", "SUP_JP"], ["SUP_JP", "FACTORY_JP"],
    ["FACTORY_JP", "WAREHOUSE_US"]
  ];
  const relations: Relationship[] = pairs.map(([supplier, customer]) => ({
    supplier, customer, sector: "Synthetic Demo", cross: false,
    what_en: "Synthetic demonstration relationship", source: "AtmoGraph synthetic demo", url: ""
  }));
  const companyMap = new Map(companies.map(c => [c.id, c]));
  const outgoing = new Map(companies.map(c => [c.id, [] as string[]]));
  const incoming = new Map(companies.map(c => [c.id, [] as string[]]));
  for (const r of relations) {
    outgoing.get(r.supplier)!.push(r.customer);
    incoming.get(r.customer)!.push(r.supplier);
  }
  return { companies: companyMap, outgoing, incoming, relationships: relations };
}

export async function loadDataset(): Promise<SupplyChainDataset> {
  const response = await fetch("/data/sectivia-supply-chain.json");
  if (!response.ok) throw new Error("Unable to load Sectivia dataset");
  return response.json();
}

export function buildGraph(dataset: SupplyChainDataset): Graph {
  const companies = new Map<string, Company>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const relationships: Relationship[] = [];
  const seen = new Set<string>();

  for (const company of dataset.companies) {
    companies.set(company.id, company);
    outgoing.set(company.id, []);
    incoming.set(company.id, []);
  }

  for (const relation of dataset.relations) {
    const { supplier, customer } = relation;
    const key = `${supplier}->${customer}`;

    if (
      companies.has(supplier) &&
      companies.has(customer) &&
      !seen.has(key)
    ) {
      seen.add(key);
      outgoing.get(supplier)!.push(customer);
      incoming.get(customer)!.push(supplier);
      relationships.push(relation);
    }
  }

  return { companies, outgoing, incoming, relationships };
}

function normalizeScores(values: Map<string, number>) {
  const maximum = Math.max(0, ...Array.from(values.values()));
  return new Map(
    Array.from(values.entries()).map(([id, value]) => [
      id,
      maximum === 0 ? 0 : Math.round(value / maximum * 10000) / 100,
    ])
  );
}

function getDownstreamCounts(graph: Graph) {
  const counts = new Map<string, number>();

  for (const id of Array.from(graph.companies.keys())) {
    const visited = new Set<string>();
    const queue = [...(graph.outgoing.get(id) ?? [])];

    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (visited.has(current)) continue;
      visited.add(current);

      for (const next of graph.outgoing.get(current) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }

    counts.set(id, visited.size);
  }

  return counts;
}

function calculateBetweenness(graph: Graph) {
  const ids = [...Array.from(graph.companies.keys())];
  const centrality = new Map(ids.map(id => [id, 0]));

  for (const source of ids) {
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>();
    const paths = new Map<string, number>();
    const distance = new Map<string, number>();
    const dependency = new Map<string, number>();

    for (const id of ids) {
      predecessors.set(id, []);
      paths.set(id, 0);
      distance.set(id, -1);
      dependency.set(id, 0);
    }

    paths.set(source, 1);
    distance.set(source, 0);
    const queue = [source];

    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      stack.push(current);

      for (const next of graph.outgoing.get(current) ?? []) {
        if (distance.get(next) === -1) {
          distance.set(next, distance.get(current)! + 1);
          queue.push(next);
        }

        if (distance.get(next) === distance.get(current)! + 1) {
          paths.set(next, paths.get(next)! + paths.get(current)!);
          predecessors.get(next)!.push(current);
        }
      }
    }

    while (stack.length) {
      const current = stack.pop()!;

      for (const previous of predecessors.get(current)!) {
        const contribution =
          paths.get(previous)! / paths.get(current)! *
          (1 + dependency.get(current)!);

        dependency.set(
          previous,
          dependency.get(previous)! + contribution
        );
      }

      if (current !== source) {
        centrality.set(
          current,
          centrality.get(current)! + dependency.get(current)!
        );
      }
    }
  }

  const n = ids.length;
  const scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 0;

  for (const id of ids) {
    centrality.set(id, centrality.get(id)! * scale);
  }

  return centrality;
}

export function calculateStructuralRisk(graph: Graph) {
  const ids = [...Array.from(graph.companies.keys())];
  const supplierCounts = new Map<string, number>();
  const customerCounts = new Map<string, number>();
  const scarcity = new Map<string, number>();

  for (const id of ids) {
    const suppliers = graph.incoming.get(id)?.length ?? 0;
    const customers = graph.outgoing.get(id)?.length ?? 0;

    supplierCounts.set(id, suppliers);
    customerCounts.set(id, customers);
    scarcity.set(id, 1 / (1 + suppliers));
  }

  const downstream = getDownstreamCounts(graph);
  const centrality = calculateBetweenness(graph);

  const supplierScores = normalizeScores(scarcity);
  const downstreamScores = normalizeScores(downstream);
  const centralityScores = normalizeScores(centrality);
  const customerScores = normalizeScores(customerCounts);

  const companies = ids.map(id => {
    const company = graph.companies.get(id)!;
    const supplierScore = supplierScores.get(id)!;
    const downstreamScore = downstreamScores.get(id)!;
    const centralityScore = centralityScores.get(id)!;
    const customerScore = customerScores.get(id)!;

    const score = Math.round((
      0.30 * supplierScore +
      0.30 * downstreamScore +
      0.25 * centralityScore +
      0.15 * customerScore
    ) * 100) / 100;

    return {
      id,
      name: company.name,
      ticker: company.ticker,
      sector: company.sector,
      country: company.country,
      supplier_count: supplierCounts.get(id)!,
      customer_count: customerCounts.get(id)!,
      downstream_reach: downstream.get(id)!,
      supplier_scarcity_score: supplierScore,
      downstream_exposure_score: downstreamScore,
      network_centrality_score: centralityScore,
      customer_reach_score: customerScore,
      structural_vulnerability_index: score,
      structural_level: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
      data_source: "Sectivia",
    };
  });

  companies.sort(
    (a, b) =>
      b.structural_vulnerability_index - a.structural_vulnerability_index
  );

  return {
    total_companies: graph.companies.size,
    total_relationships: graph.relationships.length,
    companies,
    method: "Weighted structural network indicators",
    weights: {
      supplier_scarcity: 0.30,
      downstream_exposure: 0.30,
      network_centrality: 0.25,
      customer_reach: 0.15,
    },
    limitations: [
      "Based on documented company relationships only.",
      "Does not include purchase volumes or supplier spend shares.",
      "Does not measure actual disruption probability.",
      "Scores are heuristic structural indicators, not trained ML predictions.",
    ],
    data_type: "structural_network_analysis",
  };
}

export function propagateDisruption(
  graph: Graph,
  sourceId: string,
  severity = 80
) {
  if (!graph.companies.has(sourceId)) {
    throw new Error("Source company not found");
  }

  const initialSeverity = Math.max(0, Math.min(100, severity));
  const distances = new Map<string, number>([[sourceId, 0]]);
  const queue = [sourceId];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const distance = distances.get(current)!;

    for (const next of graph.outgoing.get(current) ?? []) {
      if (!distances.has(next)) {
        distances.set(next, distance + 1);
        queue.push(next);
      }
    }
  }

  const affectedEntities = Array.from(distances.entries())
    .filter(([id]) => id !== sourceId)
    .map(([id, distance]) => {
      const company = graph.companies.get(id)!;
      const risk = Math.round(
        initialSeverity * Math.pow(0.75, distance - 1) * 100
      ) / 100;

      return {
        id,
        name: company.name,
        type: company.segment,
        country: company.country,
        distance,
        risk_score: risk,
        risk_level: risk >= 60 ? "High" : risk >= 30 ? "Medium" : "Low",
        estimated_delay_days: Math.round(risk * 0.25 * 10) / 10,
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score);

  return {
    source_entity: graph.companies.get(sourceId)!.name,
    initial_severity: initialSeverity,
    total_affected: affectedEntities.length,
    affected_entities: affectedEntities,
    method: "Directed downstream disruption propagation",
    data_type: "structural_scenario_analysis",
  };
}

export function analyzeDependencies(
  graph: Graph,
  companyId: string,
  direction: "upstream" | "downstream",
  depth = 2
) {
  const source = graph.companies.get(companyId);
  if (!source) throw new Error("Company not found");

  const maxDepth = Math.max(1, Math.min(5, depth));
  const visited = new Map<string, number>();
  const connections: { source: string; target: string; level: number }[] = [];
  let frontier = [companyId];

  for (let level = 1; level <= maxDepth; level++) {
    const nextFrontier: string[] = [];

    for (const current of frontier) {
      const neighbors = direction === "upstream"
        ? graph.incoming.get(current) ?? []
        : graph.outgoing.get(current) ?? [];

      for (const neighbor of neighbors) {
        connections.push({
          source: direction === "upstream" ? neighbor : current,
          target: direction === "upstream" ? current : neighbor,
          level,
        });

        if (!visited.has(neighbor)) {
          visited.set(neighbor, level);
          nextFrontier.push(neighbor);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  const companies = Array.from(visited.entries()).map(([id, level]) => {
    const company = graph.companies.get(id)!;
    return {
      id,
      name: company.name,
      ticker: company.ticker,
      sector: company.sector,
      country: company.country,
      level,
    };
  });

  return {
    source: {
      id: source.id,
      name: source.name,
      ticker: source.ticker,
      sector: source.sector,
      country: source.country,
    },
    direction,
    depth: maxDepth,
    total_companies_found: companies.length,
    total_connections_found: connections.length,
    companies,
    connections,
    data_type: "documented_company_relationships",
    attribution: "Sectivia supply-chain dataset",
  };
}

export function analyzeImpact(
  graph: Graph,
  sourceId: string,
  severity = 80,
  depth = 3
) {
  const source = graph.companies.get(sourceId);
  if (!source) throw new Error("Source company not found");

  const initialSeverity = Math.max(0, Math.min(100, severity));
  const maxDepth = Math.max(1, Math.min(5, depth));
  const visited = new Set<string>([sourceId]);
  const affected: {
    id: string;
    name: string;
    ticker: string;
    sector: string;
    country: string;
    level: number;
    impact_score: number;
    impact_level: string;
  }[] = [];
  const connections: { source: string; target: string; level: number }[] = [];
  const levelSummary: { level: number; affected_companies: number }[] = [];
  let frontier = [sourceId];

  for (let level = 1; level <= maxDepth; level++) {
    const next: string[] = [];
    let count = 0;

    for (const current of frontier) {
      for (const target of graph.outgoing.get(current) ?? []) {
        connections.push({ source: current, target, level });

        if (visited.has(target)) continue;
        visited.add(target);
        next.push(target);
        count++;

        const company = graph.companies.get(target)!;
        const score = Math.round(
          initialSeverity * Math.pow(0.75, level - 1) * 100
        ) / 100;

        affected.push({
          id: target,
          name: company.name,
          ticker: company.ticker,
          sector: company.sector,
          country: company.country,
          level,
          impact_score: score,
          impact_level: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
        });
      }
    }

    levelSummary.push({ level, affected_companies: count });
    frontier = next;
    if (!frontier.length) break;
  }

  return {
    scenario: "Supply-chain disruption impact analysis",
    source: {
      id: source.id,
      name: source.name,
      ticker: source.ticker,
      sector: source.sector,
      country: source.country,
    },
    initial_severity: initialSeverity,
    depth: maxDepth,
    total_affected: affected.length,
    total_connections: connections.length,
    level_summary: levelSummary,
    affected_companies: affected,
    connections,
    method: "Multi-level directed network impact propagation",
    data_type: "documented_company_relationships",
    limitations: [
      "Based on documented company relationships only.",
      "Does not include purchase volumes or supplier spend shares.",
      "Impact scores are scenario estimates, not actual disruption probabilities.",
    ],
    attribution: "Sectivia supply-chain dataset",
  };
}
