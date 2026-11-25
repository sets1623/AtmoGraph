from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json

from app.database.sqlite_db import get_connection, initialize_database
from app.data.sectivia_importer import load_sectivia_graph
from app.risk_engine import calculate_structural_risk

from app.graph_engine import (
    build_supply_chain_graph,
    propagate_disruption,
    get_downstream_entities,
    calculate_graph_metrics,
)

app = FastAPI(
    title="AtmoGraph API",
    description="Supply Chain Ripple Effect Intelligence Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = build_supply_chain_graph()
sectivia_graph = load_sectivia_graph()
initialize_database()


class SimulationRequest(BaseModel):
    source_id: str
    severity: float = Field(default=80, ge=0, le=100)


class ImpactAnalysisRequest(BaseModel):
    source_id: str
    severity: float = Field(default=80, ge=0, le=100)
    depth: int = Field(default=3, ge=1, le=5)


@app.get("/")
def root():
    return {"message": "Welcome to AtmoGraph API"}


@app.get("/api/v1/health")
def health():
    return {
        "status": "healthy",
        "application": "AtmoGraph",
    }


@app.get("/api/v1/overview")
def overview():
    return {
        **calculate_graph_metrics(graph),
        "active_disruptions": 1,
        "data_type": "synthetic",
    }


@app.get("/api/v1/graph")
def get_graph():
    return {
        "nodes": [
            {"id": node_id, **data}
            for node_id, data in graph.nodes(data=True)
        ],
        "edges": [
            {"source": source, "target": target}
            for source, target in graph.edges()
        ],
        "data_type": "synthetic",
    }




@app.get("/api/v1/sectivia/graph")
def get_sectivia_graph():
    return {
        "dataset": "Sectivia U.S. Supply-Chain Graph",
        "attribution": "Sectivia (https://sectivia.com), CC BY 4.0",
        "license": "CC BY 4.0",
        "total_companies": sectivia_graph.number_of_nodes(),
        "total_relationships": sectivia_graph.number_of_edges(),
        "nodes": [
            {"id": node_id, **data}
            for node_id, data in sectivia_graph.nodes(data=True)
        ],
        "edges": [
            {"source": source, "target": target, **data}
            for source, target, data in sectivia_graph.edges(data=True)
        ],
        "data_type": "documented_company_relationships"
    }


@app.get("/api/v1/sectivia/risk-analysis")
def sectivia_risk_analysis():
    return {
        "dataset": "Sectivia U.S. Supply-Chain Graph",
        "attribution": "Sectivia (https://sectivia.com), CC BY 4.0",
        **calculate_structural_risk(sectivia_graph),
    }




@app.get("/api/v1/sectivia/company/{entity_id}/dependencies")
def sectivia_company_dependencies(
    entity_id: str,
    direction: str = "downstream",
    depth: int = 2
):
    from collections import deque

    if entity_id not in sectivia_graph:
        raise HTTPException(404, "Company not found in Sectivia dataset")

    if direction not in ("upstream", "downstream"):
        raise HTTPException(400, "Direction must be upstream or downstream")

    if depth < 1 or depth > 5:
        raise HTTPException(400, "Depth must be between 1 and 5")

    visited = {entity_id}
    queue = deque([(entity_id, 0)])
    companies = []
    connections = []

    while queue:
        current, level = queue.popleft()

        if level >= depth:
            continue

        neighbors = (
            sectivia_graph.predecessors(current)
            if direction == "upstream"
            else sectivia_graph.successors(current)
        )

        for neighbor in neighbors:
            connections.append({
                "source": neighbor if direction == "upstream" else current,
                "target": current if direction == "upstream" else neighbor,
                "level": level + 1
            })

            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, level + 1))

                data = sectivia_graph.nodes[neighbor]
                companies.append({
                    "id": neighbor,
                    "name": data.get("name", neighbor),
                    "ticker": data.get("ticker", ""),
                    "sector": data.get("sector", ""),
                    "country": data.get("country", ""),
                    "level": level + 1
                })

    source_data = sectivia_graph.nodes[entity_id]

    return {
        "source": {
            "id": entity_id,
            "name": source_data.get("name", entity_id),
            "ticker": source_data.get("ticker", ""),
            "sector": source_data.get("sector", ""),
            "country": source_data.get("country", "")
        },
        "direction": direction,
        "depth": depth,
        "total_companies_found": len(companies),
        "total_connections_found": len(connections),
        "companies": companies,
        "connections": connections,
        "data_type": "documented_company_relationships",
        "attribution": "Sectivia (https://sectivia.com), CC BY 4.0"
    }

@app.post("/api/v1/sectivia/impact-analysis")
def sectivia_impact_analysis(request: ImpactAnalysisRequest):
    from collections import deque

    source_id = request.source_id
    severity = request.severity
    depth = request.depth

    if source_id not in sectivia_graph:
        raise HTTPException(404, "Company not found in Sectivia dataset")

    visited = {source_id}
    queue = deque([(source_id, 0)])
    affected_companies = []
    connections = []
    level_counts = {}

    while queue:
        current, current_level = queue.popleft()

        if current_level >= depth:
            continue

        for neighbor in sectivia_graph.successors(current):
            next_level = current_level + 1

            connections.append({
                "source": current,
                "target": neighbor,
                "level": next_level
            })

            if neighbor in visited:
                continue

            visited.add(neighbor)
            queue.append((neighbor, next_level))

            company = sectivia_graph.nodes[neighbor]

            impact_score = round(
                severity * (0.75 ** (next_level - 1)), 2
            )

            impact_level = (
                "High" if impact_score >= 70
                else "Medium" if impact_score >= 40
                else "Low"
            )

            affected_companies.append({
                "id": neighbor,
                "name": company.get("name", neighbor),
                "ticker": company.get("ticker", ""),
                "sector": company.get("sector", ""),
                "country": company.get("country", ""),
                "level": next_level,
                "impact_score": impact_score,
                "impact_level": impact_level
            })

            level_counts[next_level] = level_counts.get(next_level, 0) + 1

    source_data = sectivia_graph.nodes[source_id]

    return {
        "scenario": "Sectivia Supply-Chain Impact Analysis",
        "source": {
            "id": source_id,
            "name": source_data.get("name", source_id),
            "ticker": source_data.get("ticker", ""),
            "sector": source_data.get("sector", ""),
            "country": source_data.get("country", "")
        },
        "initial_severity": severity,
        "depth": depth,
        "total_affected": len(affected_companies),
        "total_connections": len(connections),
        "level_summary": [
            {
                "level": level,
                "affected_companies": count
            }
            for level, count in sorted(level_counts.items())
        ],
        "affected_companies": affected_companies,
        "connections": connections,
        "method": "Downstream graph traversal with illustrative distance-based impact decay",
        "data_type": "documented_company_relationships_with_heuristic_impact",
        "limitations": [
            "Impact scores are illustrative scenario estimates, not measured losses.",
            "The dataset does not establish actual purchase volumes or financial exposure.",
            "This is not a trained machine-learning prediction.",
            "Results depend on the documented relationships in the Sectivia dataset."
        ],
        "attribution": "Sectivia (https://sectivia.com), CC BY 4.0"
    }


@app.get("/api/v1/graph/{entity_id}/downstream")
def downstream(entity_id: str):
    if entity_id not in graph:
        raise HTTPException(404, "Entity not found")

    return {
        "source": entity_id,
        "affected_entities": get_downstream_entities(
            graph, entity_id
        ),
        "data_type": "synthetic",
    }


@app.post("/api/v1/simulate")
def simulate(request: SimulationRequest):
    try:
        affected = propagate_disruption(
            graph,
            request.source_id,
            request.severity,
        )
    except ValueError:
        raise HTTPException(404, "Source entity not found")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO simulation_history
            (source_entity, initial_severity, total_affected, affected_entities)
            VALUES (?, ?, ?, ?)
            """,
            (
                request.source_id,
                request.severity,
                len(affected),
                json.dumps(affected),
            ),
        )

    return {
        "scenario": "Supply Chain Disruption Simulation",
        "source_entity": request.source_id,
        "initial_severity": request.severity,
        "total_affected": len(affected),
        "affected_entities": affected,
        "method": "NetworkX graph traversal with illustrative distance-based risk decay",
        "data_type": "synthetic",
    }


@app.get("/api/v1/simulation-history")
def get_simulation_history():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM simulation_history
            ORDER BY id DESC
            """
        ).fetchall()

    return {
        "total": len(rows),
        "history": [
            {
                "id": row["id"],
                "source_entity": row["source_entity"],
                "initial_severity": row["initial_severity"],
                "total_affected": row["total_affected"],
                "affected_entities": json.loads(row["affected_entities"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ],
    }


@app.get("/api/v1/disruptions")
def get_disruptions():
    return {
        "disruptions": [
            {
                "id": "DISRUPTION_001",
                "title": "European Port Supply Disruption",
                "location": "Germany",
                "severity": "High",
                "status": "Active",
                "source": "Synthetic Demo"
            }
        ],
        "total": 1,
        "data_type": "synthetic"
    }


@app.delete("/api/v1/simulation-history")
def delete_simulation_history():
    with get_connection() as connection:
        connection.execute("DELETE FROM simulation_history")

    return {
        "message": "Simulation history cleared successfully",
        "total": 0
    }
