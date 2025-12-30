# # utils/db_neo4j.py

# import os
# from neo4j import GraphDatabase
# from dotenv import load_dotenv

# # Load environment variables from your .env file
# load_dotenv()

# NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j_db:7687")
# NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
# NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD") # IMPORTANT: Set this in your .env file

# class Neo4jConnection:
#     """Manages the Neo4j database driver and sessions."""
#     def __init__(self, uri, user, password):
#         # The driver is the main entry point for the Neo4j Python driver
#         self._driver = GraphDatabase.driver(uri, auth=(user, password))

#     def close(self):
#         """Closes the driver connection."""
#         if self._driver is not None:
#             self._driver.close()

#     def get_session(self):
#         """Returns a new session to run queries against."""
#         return self._driver.session()

# # Create a single, global instance of the connection manager
# # This instance will be used throughout your application
# neo4j_conn = Neo4jConnection(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

# # A simple function to be used by your services
# def get_neo4j_session():
#     return neo4j_conn.get_session()

# Neo4j temporarily disabled for testing backend without graph DB.

def get_neo4j_session():
    print("⚠️ Neo4j session not available. Returning None.")
    return None
