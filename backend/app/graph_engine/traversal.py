import networkx as nx

def get_downstream_entities(graph, entity_id):
    if entity_id not in graph:
        return []

    return [
        {
            "id": node_id,
            **graph.nodes[node_id]
        }
        for node_id in nx.descendants(graph, entity_id)
    ]
