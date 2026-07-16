# Lecture 5: Database Design Principles

## Learning Objectives
- Understand normalization concepts
- Learn about database indexing
- Explore query optimization techniques

## Key Concepts

### Normalization
Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity.

**First Normal Form (1NF):**
- Each column contains atomic values
- Each record is unique
- No repeating groups

**Second Normal Form (2NF):**
- Must be in 1NF
- All non-key columns depend on the entire primary key

**Third Normal Form (3NF):**
- Must be in 2NF
- No transitive dependencies

### Indexing
Indexes improve query performance by allowing faster data retrieval.

**Types of Indexes:**
1. Primary Index - automatically created with primary key
2. Secondary Index - created on non-key columns
3. Composite Index - index on multiple columns
4. Unique Index - enforces uniqueness constraint

### Query Optimization
- Use EXPLAIN to analyze query plans
- Avoid SELECT * in production code
- Use appropriate JOIN types
- Limit result sets with LIMIT/OFFSET
- Cache frequently accessed data

## Practice Exercises
1. Design a normalized database schema for a library system
2. Create indexes for common query patterns
3. Optimize a slow-running query using EXPLAIN

## Next Lecture
Query Performance Monitoring and Profiling
