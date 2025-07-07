// Schema and seed data for Neo4j Aura
// Nodes: User, City, Preference, Product, Place, Cuisine, Store
// Relationships: VISITED, PREFERS, NEEDS, ORDERED, LIKES, SELLS

// Create sample cities
CREATE (ny:City {name: 'New York', country: 'USA', weather: 'rainy'})
CREATE (tokyo:City {name: 'Tokyo', country: 'Japan', weather: 'sunny'})

// Create sample user
CREATE (u:User {name: 'Alice', email: 'alice@example.com'})

// Create preferences
CREATE (p1:Preference {type: 'outdoor'})
CREATE (p2:Preference {type: 'foodie'})

// Create products
CREATE (jacket:Product {name: 'Rain Jacket', category: 'clothes'})
CREATE (umbrella:Product {name: 'Umbrella', category: 'gear'})
CREATE (sushi:Product {name: 'Sushi Set', category: 'food'})

// Create stores
CREATE (uniqlo:Store {name: 'Uniqlo', city: 'Tokyo'})
CREATE (rei:Store {name: 'REI', city: 'New York'})

// Create relationships
CREATE (u)-[:PREFERS]->(p1)
CREATE (u)-[:PREFERS]->(p2)
CREATE (uniqlo)-[:SELLS]->(jacket)
CREATE (rei)-[:SELLS]->(umbrella)
CREATE (uniqlo)-[:SELLS]->(sushi)
CREATE (u)-[:VISITED]->(ny)
CREATE (u)-[:LIKES]->(sushi) 