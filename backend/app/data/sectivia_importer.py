import json
from pathlib import Path

import networkx as nx

DATA_FILE = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "raw"
    / "sectivia-supply-chain.json"
)


def load_sectivia_graph():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")

    with DATA_FILE.open("r", encoding="utf-8") as file:
        dataset = json.load(file)

    graph = nx.DiGraph()

    for company in dataset["companies"]:
        graph.add_node(
            company["id"],
            name=company["name"],
            ticker=company.get("ticker", ""),
            sector=company.get("sector", ""),
            country=company.get("country", "USA"),
            data_source="Sectivia"
        )

    for relation in dataset["relations"]:
        supplier = relation["supplier"]
        customer = relation["customer"]

        if supplier in graph and customer in graph:
            graph.add_edge(
                supplier,
                customer,
                description=relation.get("what_en", ""),
                source=relation.get("source", ""),
                source_url=relation.get("url", "")
            )

    return graph


if __name__ == "__main__":
    graph = load_sectivia_graph()

    print("SUCCESS: Sectivia dataset imported")
    print("Companies:", graph.number_of_nodes())
    print("Relationships:", graph.number_of_edges())
    print("Graph directed:", graph.is_directed())

    print("\nSample companies:")
    for node, details in list(graph.nodes(data=True))[:5]:
        print(node, "-", details["name"])

    print("\nSample relationships:")
    for source, target, details in list(graph.edges(data=True))[:5]:
        print(
            graph.nodes[source]["name"],
            "->",
            graph.nodes[target]["name"],
            "|",
            details["description"]
        )
