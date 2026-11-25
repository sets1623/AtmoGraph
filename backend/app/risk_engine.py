import networkx as nx


def normalize_scores(values):
    """Normalize non-negative values to a 0-100 scale."""
    maximum = max(values.values(), default=0)

    if maximum == 0:
        return {key: 0.0 for key in values}

    return {
        key: round((value / maximum) * 100, 2)
        for key, value in values.items()
    }


def calculate_structural_risk(graph):
    """
    Calculate a structural vulnerability proxy from documented
    supplier/customer relationships.

    This is not a probability of disruption or a trained ML prediction.
    """
    if graph.number_of_nodes() == 0:
        return {
            "total_companies": 0,
            "total_relationships": 0,
            "companies": [],
        }

    supplier_counts = dict(graph.in_degree())
    customer_counts = dict(graph.out_degree())

    # Fewer documented suppliers means greater potential dependency.
    supplier_scarcity_raw = {
        node: 1 / (1 + supplier_counts[node])
        for node in graph.nodes()
    }

    # Number of companies reachable downstream.
    downstream_counts = {
        node: len(nx.descendants(graph, node))
        for node in graph.nodes()
    }

    # Structural importance in the directed network.
    centrality = nx.betweenness_centrality(
        graph,
        normalized=True
    )

    supplier_scores = normalize_scores(supplier_scarcity_raw)
    downstream_scores = normalize_scores(downstream_counts)
    centrality_scores = normalize_scores(centrality)
    customer_scores = normalize_scores(customer_counts)

    results = []

    for node, data in graph.nodes(data=True):
        supplier_score = supplier_scores[node]
        downstream_score = downstream_scores[node]
        centrality_score = centrality_scores[node]
        customer_score = customer_scores[node]

        # Transparent heuristic weighting; not statistically trained.
        structural_score = (
            0.30 * supplier_score
            + 0.30 * downstream_score
            + 0.25 * centrality_score
            + 0.15 * customer_score
        )

        score = round(structural_score, 2)

        if score >= 70:
            level = "High"
        elif score >= 40:
            level = "Medium"
        else:
            level = "Low"

        results.append({
            "id": node,
            "name": data.get("name", node),
            "ticker": data.get("ticker", ""),
            "sector": data.get("sector", ""),
            "country": data.get("country", ""),
            "supplier_count": supplier_counts[node],
            "customer_count": customer_counts[node],
            "downstream_reach": downstream_counts[node],
            "supplier_scarcity_score": supplier_score,
            "downstream_exposure_score": downstream_score,
            "network_centrality_score": centrality_score,
            "customer_reach_score": customer_score,
            "structural_vulnerability_index": score,
            "structural_level": level,
            "data_source": data.get("data_source", "Unknown"),
        })

    results.sort(
        key=lambda item: item["structural_vulnerability_index"],
        reverse=True
    )

    return {
        "total_companies": graph.number_of_nodes(),
        "total_relationships": graph.number_of_edges(),
        "companies": results,
        "method": "Weighted structural network indicators",
        "weights": {
            "supplier_scarcity": 0.30,
            "downstream_exposure": 0.30,
            "network_centrality": 0.25,
            "customer_reach": 0.15,
        },
        "limitations": [
            "Based on documented company relationships only.",
            "Does not include purchase volumes or supplier spend shares.",
            "Does not measure actual disruption probability.",
            "Scores are heuristic structural indicators, not trained ML predictions."
        ],
        "data_type": "structural_network_analysis",
    }
