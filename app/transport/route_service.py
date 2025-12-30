# services/route_service.py
from utils.db_neo4j import get_neo4j_session

def find_shortest_route(start_station_name: str, end_station_name: str):
    """
    Fallback-safe route finder.
    If Neo4j is disabled, returns a simple demo response instead of erroring out.
    """
    session = get_neo4j_session()
    if not session:
        # Neo4j is disabled, return fallback response
        return {
            "status": "Neo4j disabled",
            "message": f"Using fallback route logic between {start_station_name} and {end_station_name}.",
            "route": [start_station_name, "Demo Stop", end_station_name]
        }

    # If Neo4j were enabled, you could re-enable the query below
    try:
        query = """
        MATCH path = shortestPath(
            (start:Station {name: $start})-[:CONNECTED*]->(end:Station {name: $end})
        )
        UNWIND nodes(path) AS station
        RETURN station.name AS station_name
        """
        start = start_station_name.strip()
        end = end_station_name.strip()
        print(f"Looking up route: {start} → {end}")

        result = session.run(query, start=start, end=end)
        path_stations = [record["station_name"] for record in result]
        print("Result:", path_stations)

        if not path_stations:
            return {"status": "error", "message": "No route found between the specified stations."}
        return {"status": "success", "route": path_stations}

    except Exception as e:
        return {"status": "error", "message": str(e)}

    finally:
        session.close()
