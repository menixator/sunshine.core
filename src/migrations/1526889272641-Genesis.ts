import {MigrationInterface, QueryRunner} from "typeorm";

export class genesis1526893359183 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "roles" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "roles" ("name") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "hash" varchar NOT NULL, "roleId" integer NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51b8b26ac168fbe7d6f5653e6c" ON "users" ("name") `);
        await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" varchar NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "lastTouched" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "userId" integer)`);
        await queryRunner.query(`CREATE TABLE "counter_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" integer NOT NULL, "date" datetime NOT NULL, "definitionId" integer NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "derived_unit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "singular" varchar NOT NULL, "plural" varchar NOT NULL, "symSingular" varchar NOT NULL, "symPlural" varchar NOT NULL, "mult" integer NOT NULL, "parentId" integer NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "units" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "singular" varchar NOT NULL, "plural" varchar NOT NULL, "symSingular" varchar NOT NULL, "symPlural" varchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "counter_definition" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer, "unitId" integer, CONSTRAINT "equipment_counter_definition" UNIQUE ("equipmentId", "name"))`);
        await queryRunner.query(`CREATE TABLE "named_time_ranges" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fcbf3349ecfe991a4a1b28bab1" ON "named_time_ranges" ("name") `);
        await queryRunner.query(`CREATE TABLE "measurement_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" integer NOT NULL, "date" datetime NOT NULL, "definitionId" integer NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "measurement_definitions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "rangeId" integer, "unitId" integer NOT NULL, "equipmentId" integer NOT NULL, CONSTRAINT "equipment_measurement_definition" UNIQUE ("equipmentId", "name"))`);
        await queryRunner.query(`CREATE TABLE "equipments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "comparator" varchar NOT NULL, "realmId" integer NOT NULL, CONSTRAINT "realm_equipment_idx" UNIQUE ("realmId", "name"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a8cfc2466b08483257f8b6b600" ON "equipments" ("comparator") `);
        await queryRunner.query(`CREATE TABLE "realms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "clusterId" integer, CONSTRAINT "idx_unique_cluster_realm_name" UNIQUE ("clusterId", "name"))`);
        await queryRunner.query(`CREATE TABLE "clusters" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9866753a0c6ffd4adebb5cc236" ON "clusters" ("name") `);
        await queryRunner.query(`DROP INDEX "IDX_51b8b26ac168fbe7d6f5653e6c"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "hash" varchar NOT NULL, "roleId" integer NOT NULL, CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "name", "hash", "roleId") SELECT "id", "name", "hash", "roleId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51b8b26ac168fbe7d6f5653e6c" ON "users" ("name") `);
        await queryRunner.query(`CREATE TABLE "temporary_auth_tokens" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" varchar NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "lastTouched" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "userId" integer, CONSTRAINT "FK_c25fb956ebada4b256501585cca" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_auth_tokens"("id", "value", "created", "lastTouched", "userId") SELECT "id", "value", "created", "lastTouched", "userId" FROM "auth_tokens"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`ALTER TABLE "temporary_auth_tokens" RENAME TO "auth_tokens"`);
        await queryRunner.query(`CREATE TABLE "temporary_counter_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" integer NOT NULL, "date" datetime NOT NULL, "definitionId" integer NOT NULL, CONSTRAINT "FK_1caad300833d3597f400e123b1c" FOREIGN KEY ("definitionId") REFERENCES "counter_definition" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_counter_readings"("id", "value", "date", "definitionId") SELECT "id", "value", "date", "definitionId" FROM "counter_readings"`);
        await queryRunner.query(`DROP TABLE "counter_readings"`);
        await queryRunner.query(`ALTER TABLE "temporary_counter_readings" RENAME TO "counter_readings"`);
        await queryRunner.query(`CREATE TABLE "temporary_derived_unit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "singular" varchar NOT NULL, "plural" varchar NOT NULL, "symSingular" varchar NOT NULL, "symPlural" varchar NOT NULL, "mult" integer NOT NULL, "parentId" integer NOT NULL, CONSTRAINT "FK_5147525fa72081ee179caa7ad00" FOREIGN KEY ("parentId") REFERENCES "units" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_derived_unit"("id", "singular", "plural", "symSingular", "symPlural", "mult", "parentId") SELECT "id", "singular", "plural", "symSingular", "symPlural", "mult", "parentId" FROM "derived_unit"`);
        await queryRunner.query(`DROP TABLE "derived_unit"`);
        await queryRunner.query(`ALTER TABLE "temporary_derived_unit" RENAME TO "derived_unit"`);
        await queryRunner.query(`CREATE TABLE "temporary_counter_definition" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer, "unitId" integer, CONSTRAINT "equipment_counter_definition" UNIQUE ("equipmentId", "name"), CONSTRAINT "FK_5d58e8e54f8d9bf3d99e87e0f33" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id") ON DELETE CASCADE, CONSTRAINT "FK_6ec8bf48964bb7ebf7ede680a57" FOREIGN KEY ("unitId") REFERENCES "units" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_counter_definition"("id", "name", "equipmentId", "unitId") SELECT "id", "name", "equipmentId", "unitId" FROM "counter_definition"`);
        await queryRunner.query(`DROP TABLE "counter_definition"`);
        await queryRunner.query(`ALTER TABLE "temporary_counter_definition" RENAME TO "counter_definition"`);
        await queryRunner.query(`CREATE TABLE "temporary_measurement_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" integer NOT NULL, "date" datetime NOT NULL, "definitionId" integer NOT NULL, CONSTRAINT "FK_f8fdf6e4df3aa436b67518e7ae1" FOREIGN KEY ("definitionId") REFERENCES "measurement_definitions" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_measurement_readings"("id", "value", "date", "definitionId") SELECT "id", "value", "date", "definitionId" FROM "measurement_readings"`);
        await queryRunner.query(`DROP TABLE "measurement_readings"`);
        await queryRunner.query(`ALTER TABLE "temporary_measurement_readings" RENAME TO "measurement_readings"`);
        await queryRunner.query(`CREATE TABLE "temporary_measurement_definitions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "rangeId" integer, "unitId" integer NOT NULL, "equipmentId" integer NOT NULL, CONSTRAINT "equipment_measurement_definition" UNIQUE ("equipmentId", "name"), CONSTRAINT "FK_3bda49817bbe9cc89075b9684a4" FOREIGN KEY ("rangeId") REFERENCES "named_time_ranges" ("id") ON DELETE CASCADE, CONSTRAINT "FK_ef0c26d9658cd040a756e606137" FOREIGN KEY ("unitId") REFERENCES "units" ("id") ON DELETE CASCADE, CONSTRAINT "FK_e9d603218d4ddb79ff68893e92b" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_measurement_definitions"("id", "name", "rangeId", "unitId", "equipmentId") SELECT "id", "name", "rangeId", "unitId", "equipmentId" FROM "measurement_definitions"`);
        await queryRunner.query(`DROP TABLE "measurement_definitions"`);
        await queryRunner.query(`ALTER TABLE "temporary_measurement_definitions" RENAME TO "measurement_definitions"`);
        await queryRunner.query(`DROP INDEX "IDX_a8cfc2466b08483257f8b6b600"`);
        await queryRunner.query(`CREATE TABLE "temporary_equipments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "comparator" varchar NOT NULL, "realmId" integer NOT NULL, CONSTRAINT "realm_equipment_idx" UNIQUE ("realmId", "name"), CONSTRAINT "FK_cba42256e8cc32cd2c54ad552f1" FOREIGN KEY ("realmId") REFERENCES "realms" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_equipments"("id", "name", "comparator", "realmId") SELECT "id", "name", "comparator", "realmId" FROM "equipments"`);
        await queryRunner.query(`DROP TABLE "equipments"`);
        await queryRunner.query(`ALTER TABLE "temporary_equipments" RENAME TO "equipments"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a8cfc2466b08483257f8b6b600" ON "equipments" ("comparator") `);
        await queryRunner.query(`CREATE TABLE "temporary_realms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "clusterId" integer, CONSTRAINT "idx_unique_cluster_realm_name" UNIQUE ("clusterId", "name"), CONSTRAINT "FK_cb5956e7fbd2dd9c50d113f2464" FOREIGN KEY ("clusterId") REFERENCES "clusters" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_realms"("id", "name", "clusterId") SELECT "id", "name", "clusterId" FROM "realms"`);
        await queryRunner.query(`DROP TABLE "realms"`);
        await queryRunner.query(`ALTER TABLE "temporary_realms" RENAME TO "realms"`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "realms" RENAME TO "temporary_realms"`);
        await queryRunner.query(`CREATE TABLE "realms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "clusterId" integer, CONSTRAINT "idx_unique_cluster_realm_name" UNIQUE ("clusterId", "name"))`);
        await queryRunner.query(`INSERT INTO "realms"("id", "name", "clusterId") SELECT "id", "name", "clusterId" FROM "temporary_realms"`);
        await queryRunner.query(`DROP TABLE "temporary_realms"`);
        await queryRunner.query(`DROP INDEX "IDX_a8cfc2466b08483257f8b6b600"`);
        await queryRunner.query(`ALTER TABLE "equipments" RENAME TO "temporary_equipments"`);
        await queryRunner.query(`CREATE TABLE "equipments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "comparator" varchar NOT NULL, "realmId" integer NOT NULL, CONSTRAINT "realm_equipment_idx" UNIQUE ("realmId", "name"))`);
        await queryRunner.query(`INSERT INTO "equipments"("id", "name", "comparator", "realmId") SELECT "id", "name", "comparator", "realmId" FROM "temporary_equipments"`);
        await queryRunner.query(`DROP TABLE "temporary_equipments"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a8cfc2466b08483257f8b6b600" ON "equipments" ("comparator") `);
        await queryRunner.query(`ALTER TABLE "measurement_definitions" RENAME TO "temporary_measurement_definitions"`);
        await queryRunner.query(`CREATE TABLE "measurement_definitions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "rangeId" integer, "unitId" integer NOT NULL, "equipmentId" integer NOT NULL, CONSTRAINT "equipment_measurement_definition" UNIQUE ("equipmentId", "name"))`);
        await queryRunner.query(`INSERT INTO "measurement_definitions"("id", "name", "rangeId", "unitId", "equipmentId") SELECT "id", "name", "rangeId", "unitId", "equipmentId" FROM "temporary_measurement_definitions"`);
        await queryRunner.query(`DROP TABLE "temporary_measurement_definitions"`);
        await queryRunner.query(`ALTER TABLE "measurement_readings" RENAME TO "temporary_measurement_readings"`);
        await queryRunner.query(`CREATE TABLE "measurement_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" integer NOT NULL, "date" datetime NOT NULL, "definitionId" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "measurement_readings"("id", "value", "date", "definitionId") SELECT "id", "value", "date", "definitionId" FROM "temporary_measurement_readings"`);
        await queryRunner.query(`DROP TABLE "temporary_measurement_readings"`);
        await queryRunner.query(`ALTER TABLE "counter_definition" RENAME TO "temporary_counter_definition"`);
        await queryRunner.query(`CREATE TABLE "counter_definition" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer, "unitId" integer, CONSTRAINT "equipment_counter_definition" UNIQUE ("equipmentId", "name"))`);
        await queryRunner.query(`INSERT INTO "counter_definition"("id", "name", "equipmentId", "unitId") SELECT "id", "name", "equipmentId", "unitId" FROM "temporary_counter_definition"`);
        await queryRunner.query(`DROP TABLE "temporary_counter_definition"`);
        await queryRunner.query(`ALTER TABLE "derived_unit" RENAME TO "temporary_derived_unit"`);
        await queryRunner.query(`CREATE TABLE "derived_unit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "singular" varchar NOT NULL, "plural" varchar NOT NULL, "symSingular" varchar NOT NULL, "symPlural" varchar NOT NULL, "mult" integer NOT NULL, "parentId" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "derived_unit"("id", "singular", "plural", "symSingular", "symPlural", "mult", "parentId") SELECT "id", "singular", "plural", "symSingular", "symPlural", "mult", "parentId" FROM "temporary_derived_unit"`);
        await queryRunner.query(`DROP TABLE "temporary_derived_unit"`);
        await queryRunner.query(`ALTER TABLE "counter_readings" RENAME TO "temporary_counter_readings"`);
        await queryRunner.query(`CREATE TABLE "counter_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" integer NOT NULL, "date" datetime NOT NULL, "definitionId" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "counter_readings"("id", "value", "date", "definitionId") SELECT "id", "value", "date", "definitionId" FROM "temporary_counter_readings"`);
        await queryRunner.query(`DROP TABLE "temporary_counter_readings"`);
        await queryRunner.query(`ALTER TABLE "auth_tokens" RENAME TO "temporary_auth_tokens"`);
        await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" varchar NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "lastTouched" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "userId" integer)`);
        await queryRunner.query(`INSERT INTO "auth_tokens"("id", "value", "created", "lastTouched", "userId") SELECT "id", "value", "created", "lastTouched", "userId" FROM "temporary_auth_tokens"`);
        await queryRunner.query(`DROP TABLE "temporary_auth_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_51b8b26ac168fbe7d6f5653e6c"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "hash" varchar NOT NULL, "roleId" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "users"("id", "name", "hash", "roleId") SELECT "id", "name", "hash", "roleId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51b8b26ac168fbe7d6f5653e6c" ON "users" ("name") `);
        await queryRunner.query(`DROP INDEX "IDX_9866753a0c6ffd4adebb5cc236"`);
        await queryRunner.query(`DROP TABLE "clusters"`);
        await queryRunner.query(`DROP TABLE "realms"`);
        await queryRunner.query(`DROP INDEX "IDX_a8cfc2466b08483257f8b6b600"`);
        await queryRunner.query(`DROP TABLE "equipments"`);
        await queryRunner.query(`DROP TABLE "measurement_definitions"`);
        await queryRunner.query(`DROP TABLE "measurement_readings"`);
        await queryRunner.query(`DROP INDEX "IDX_fcbf3349ecfe991a4a1b28bab1"`);
        await queryRunner.query(`DROP TABLE "named_time_ranges"`);
        await queryRunner.query(`DROP TABLE "counter_definition"`);
        await queryRunner.query(`DROP TABLE "units"`);
        await queryRunner.query(`DROP TABLE "derived_unit"`);
        await queryRunner.query(`DROP TABLE "counter_readings"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_51b8b26ac168fbe7d6f5653e6c"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "IDX_648e3f5447f725579d7d4ffdfb"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }

}
