import networkx as nx

def build_supply_chain_graph():
    graph = nx.DiGraph()

    nodes = [
        {"id": "PORT_EU", "name": "European Port", "type": "Port", "country": "Germany"},
        {"id": "SUP_EU", "name": "Euro Components", "type": "Supplier", "country": "Germany"},
        {"id": "FACTORY_US", "name": "North American Factory", "type": "Manufacturer", "country": "USA"},
        {"id": "WAREHOUSE_US", "name": "Central Warehouse", "type": "Warehouse", "country": "USA"},
        {"id": "RETAIL_US", "name": "Electronics Retailer", "type": "Retailer", "country": "USA"},
        {"id": "SUP_JP", "name": "Asia Materials", "type": "Supplier", "country": "Japan"},
        {"id": "FACTORY_JP", "name": "Asia Manufacturing", "type": "Manufacturer", "country": "Japan"},
        {"id": "PORT_ASIA", "name": "Asian Export Port", "type": "Port", "country": "Japan"},
    ]

    edges = [
        ("PORT_EU", "SUP_EU"),
        ("SUP_EU", "FACTORY_US"),
        ("FACTORY_US", "WAREHOUSE_US"),
        ("WAREHOUSE_US", "RETAIL_US"),
        ("PORT_ASIA", "SUP_JP"),
        ("SUP_JP", "FACTORY_JP"),
        ("FACTORY_JP", "WAREHOUSE_US"),
    ]

    for node in nodes:
        graph.add_node(node["id"], **node)

    for source, target in edges:
        graph.add_edge(source, target)

    return graph
