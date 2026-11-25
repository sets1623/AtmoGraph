def calculate_graph_metrics(graph):
    return {
        "total_entities": graph.number_of_nodes(),
        "total_connections": graph.number_of_edges(),
        "network_density": round(
            __import__("networkx").density(graph), 4
        ),
        "entity_types": {
            entity_type: sum(
                1 for _, data in graph.nodes(data=True)
                if data.get("type") == entity_type
            )
            for entity_type in sorted({
                data.get("type")
                for _, data in graph.nodes(data=True)
            })
        }
    }
