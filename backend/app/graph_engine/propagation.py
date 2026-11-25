import networkx as nx

def propagate_disruption(graph, source_id, severity=80):
    if source_id not in graph:
        raise ValueError(f"Unknown entity: {source_id}")

    severity = max(0, min(100, severity))

    affected = []

    distances = nx.single_source_shortest_path_length(
        graph, source_id
    )

    for entity_id, distance in distances.items():
        if distance == 0:
            continue

        entity = graph.nodes[entity_id]

        # Illustrative distance-based risk decay.
        risk = round(severity * (0.75 ** (distance - 1)), 2)

        if risk >= 60:
            level = "High"
        elif risk >= 30:
            level = "Medium"
        else:
            level = "Low"

        # Illustrative delay estimate, not a trained forecast.
        estimated_delay = round(risk * 0.25, 1)

        affected.append({
            "id": entity_id,
            "name": entity["name"],
            "type": entity["type"],
            "country": entity["country"],
            "distance": distance,
            "risk_score": risk,
            "risk_level": level,
            "estimated_delay_days": estimated_delay
        })

    return sorted(
        affected,
        key=lambda item: item["risk_score"],
        reverse=True
    )
