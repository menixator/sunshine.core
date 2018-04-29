import {MigrationInterface, QueryRunner} from "typeorm";

export class genesis1524742563077 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "roles" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "roles" ("name") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "hash" varchar NOT NULL, "roleId" integer)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51b8b26ac168fbe7d6f5653e6c" ON "users" ("name") `);
        await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer)`);
        await queryRunner.query(`CREATE TABLE "instantaneous_measurements" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer)`);
        await queryRunner.query(`CREATE TABLE "named_time_ranges" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "value" integer NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "measurements" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer)`);
        await queryRunner.query(`CREATE TABLE "equipments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "locationId" integer)`);
        await queryRunner.query(`CREATE TABLE "realms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "parentId" integer)`);
        await queryRunner.query(`CREATE TABLE "clusters" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL)`);
        await queryRunner.query(`DROP INDEX "IDX_51b8b26ac168fbe7d6f5653e6c"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "hash" varchar NOT NULL, "roleId" integer, CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "name", "hash", "roleId") SELECT "id", "name", "hash", "roleId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51b8b26ac168fbe7d6f5653e6c" ON "users" ("name") `);
        await queryRunner.query(`CREATE TABLE "temporary_auth_tokens" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, CONSTRAINT "FK_c25fb956ebada4b256501585cca" FOREIGN KEY ("userId") REFERENCES "users" ("id"))`);
        await queryRunner.query(`INSERT INTO "temporary_auth_tokens"("id", "userId") SELECT "id", "userId" FROM "auth_tokens"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`ALTER TABLE "temporary_auth_tokens" RENAME TO "auth_tokens"`);
        await queryRunner.query(`CREATE TABLE "temporary_instantaneous_measurements" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer, CONSTRAINT "FK_e0b6918b10149ed26bf3d3450ca" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id"))`);
        await queryRunner.query(`INSERT INTO "temporary_instantaneous_measurements"("id", "name", "equipmentId") SELECT "id", "name", "equipmentId" FROM "instantaneous_measurements"`);
        await queryRunner.query(`DROP TABLE "instantaneous_measurements"`);
        await queryRunner.query(`ALTER TABLE "temporary_instantaneous_measurements" RENAME TO "instantaneous_measurements"`);
        await queryRunner.query(`CREATE TABLE "temporary_measurements" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer, CONSTRAINT "FK_c1849502768b04013d4e44b5d57" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id"))`);
        await queryRunner.query(`INSERT INTO "temporary_measurements"("id", "name", "equipmentId") SELECT "id", "name", "equipmentId" FROM "measurements"`);
        await queryRunner.query(`DROP TABLE "measurements"`);
        await queryRunner.query(`ALTER TABLE "temporary_measurements" RENAME TO "measurements"`);
        await queryRunner.query(`CREATE TABLE "temporary_equipments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "locationId" integer, CONSTRAINT "FK_b28ca28d82d6b0109f30d9580b8" FOREIGN KEY ("locationId") REFERENCES "realms" ("id"))`);
        await queryRunner.query(`INSERT INTO "temporary_equipments"("id", "name", "locationId") SELECT "id", "name", "locationId" FROM "equipments"`);
        await queryRunner.query(`DROP TABLE "equipments"`);
        await queryRunner.query(`ALTER TABLE "temporary_equipments" RENAME TO "equipments"`);
        await queryRunner.query(`CREATE TABLE "temporary_realms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "parentId" integer, CONSTRAINT "FK_65075fc5e8cbe6a98aa6b34c29c" FOREIGN KEY ("parentId") REFERENCES "clusters" ("id"))`);
        await queryRunner.query(`INSERT INTO "temporary_realms"("id", "name", "parentId") SELECT "id", "name", "parentId" FROM "realms"`);
        await queryRunner.query(`DROP TABLE "realms"`);
        await queryRunner.query(`ALTER TABLE "temporary_realms" RENAME TO "realms"`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "realms" RENAME TO "temporary_realms"`);
        await queryRunner.query(`CREATE TABLE "realms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "parentId" integer)`);
        await queryRunner.query(`INSERT INTO "realms"("id", "name", "parentId") SELECT "id", "name", "parentId" FROM "temporary_realms"`);
        await queryRunner.query(`DROP TABLE "temporary_realms"`);
        await queryRunner.query(`ALTER TABLE "equipments" RENAME TO "temporary_equipments"`);
        await queryRunner.query(`CREATE TABLE "equipments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "locationId" integer)`);
        await queryRunner.query(`INSERT INTO "equipments"("id", "name", "locationId") SELECT "id", "name", "locationId" FROM "temporary_equipments"`);
        await queryRunner.query(`DROP TABLE "temporary_equipments"`);
        await queryRunner.query(`ALTER TABLE "measurements" RENAME TO "temporary_measurements"`);
        await queryRunner.query(`CREATE TABLE "measurements" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer)`);
        await queryRunner.query(`INSERT INTO "measurements"("id", "name", "equipmentId") SELECT "id", "name", "equipmentId" FROM "temporary_measurements"`);
        await queryRunner.query(`DROP TABLE "temporary_measurements"`);
        await queryRunner.query(`ALTER TABLE "instantaneous_measurements" RENAME TO "temporary_instantaneous_measurements"`);
        await queryRunner.query(`CREATE TABLE "instantaneous_measurements" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "equipmentId" integer)`);
        await queryRunner.query(`INSERT INTO "instantaneous_measurements"("id", "name", "equipmentId") SELECT "id", "name", "equipmentId" FROM "temporary_instantaneous_measurements"`);
        await queryRunner.query(`DROP TABLE "temporary_instantaneous_measurements"`);
        await queryRunner.query(`ALTER TABLE "auth_tokens" RENAME TO "temporary_auth_tokens"`);
        await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer)`);
        await queryRunner.query(`INSERT INTO "auth_tokens"("id", "userId") SELECT "id", "userId" FROM "temporary_auth_tokens"`);
        await queryRunner.query(`DROP TABLE "temporary_auth_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_51b8b26ac168fbe7d6f5653e6c"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "hash" varchar NOT NULL, "roleId" integer)`);
        await queryRunner.query(`INSERT INTO "users"("id", "name", "hash", "roleId") SELECT "id", "name", "hash", "roleId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51b8b26ac168fbe7d6f5653e6c" ON "users" ("name") `);
        await queryRunner.query(`DROP TABLE "clusters"`);
        await queryRunner.query(`DROP TABLE "realms"`);
        await queryRunner.query(`DROP TABLE "equipments"`);
        await queryRunner.query(`DROP TABLE "measurements"`);
        await queryRunner.query(`DROP TABLE "named_time_ranges"`);
        await queryRunner.query(`DROP TABLE "instantaneous_measurements"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_51b8b26ac168fbe7d6f5653e6c"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "IDX_648e3f5447f725579d7d4ffdfb"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }

}
