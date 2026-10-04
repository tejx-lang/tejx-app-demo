# TejX Mongo SDK (`mongo-sdk`)

A pure TejX, wire-protocol driver and client package for MongoDB.

## Features

- **Direct Wire Protocol**: Speaks MongoDB `OP_MSG` (opcode 2013) directly over TCP using `std:net`.
- **Pure TejX BSON Engine**: Complete serializer and deserializer for BSON binary format with support for all primary BSON types (Document, String, Int32, Int64, Double, Boolean, Array, Null, Binary, UTC DateTime).
- **Authentication**: Built-in support for `SCRAM-SHA-256` and `SCRAM-SHA-1` via `std:crypto`.
- **Clean Architecture**: Standard driver collections API (`find`, `findOne`, `insertOne`, `updateOne`, `upsertOne`, `deleteOne`, `ping`).
- **Connection Configuration**: Robust URI parsing (`mongodb://user:pass@host:port/dbname?options`).

## Package Structure

```text
mongo-sdk/
├── src/
│   ├── index.tx       # Public entry point and database abstractions
│   ├── client.tx      # OP_MSG wire-protocol client & connection management
│   ├── bson.tx        # BSON binary encoder & decoder
│   ├── auth.tx        # SCRAM-SHA-256 / SHA-1 authentication
│   ├── config.tx      # MongoConnectionConfig & options
│   └── json.tx        # Typed BSON-to-JSON bridge
├── tests/
│   ├── test_bson.tx   # Verification test for BSON encoder/decoder
│   └── test_client.tx # Verification test for client initialization
└── README.md
```

## Quick Start

```typescript
import { createMongoConnection, connectMongo, MongoDatabase } from "mongo-sdk/src/index.tx";
import { MongoJsonObject, objectOf } from "mongo-sdk/src/json.tx";

// 1. Configure connection
let conn = createMongoConnection("mongodb://localhost:27017", "127.0.0.1", 27017, "production_db");

// 2. Connect
let db: MongoDatabase = connectMongo(conn);
db.ping();

// 3. Insert document
let doc: MongoJsonObject = objectOf({});
doc.setString("name", "Alice");
doc.setString("role", "Developer");
db.insertOne("users", doc);

// 4. Query document
let filter: MongoJsonObject = objectOf({});
filter.setString("name", "Alice");
let user = db.findOne("users", filter);
```

## Running Tests

```bash
tejxc -r tests/test_bson.tx
tejxc -r tests/test_client.tx
```
