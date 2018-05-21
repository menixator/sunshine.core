import { Cluster } from "@entities/Cluster";
import { Equipment } from "@entities/Equipment";
import { Realm } from "@entities/Realm";
import { Role } from "@entities/Role";
import { User } from "@entities/User";
import bcrypt from "bcrypt";
import { ROLES } from "roles";
import { Container } from "typedi";
import {
  EntityManager,
  EntitySchema,
  Transaction,
  createConnection,
  useContainer as typeORMUserContainer
} from "typeorm";
import { InjectManager } from "typeorm-typedi-extensions";
import { Unit } from "@entities/Unit";
import { DerivedUnit } from "@entities/DerivedUnit";
import { MeasurementDefinition } from "@entities/MeasurementDefinition";
import { NamedTimeRange } from "@entities/NamedTimeRange";

typeORMUserContainer(Container);

class MonolithicSeed {
  @InjectManager() manager: EntityManager;

  public static runInstance() {
    createConnection().then(() => {
      Container.get(MonolithicSeed)
        .start()
        .then(() => {
          console.log(`done seeding`);
        })
        .catch(err => {
          console.error(err);
        });
    });
  }

  private getMetadata(entity: Function | EntitySchema<any>) {
    return this.manager.connection.getMetadata(entity);
  }

  private async emptyAndWipeIndices(
    entity: Function | EntitySchema<any>
  ): Promise<void> {
    await this.manager.getRepository(entity).clear();
    await this.manager.query(`DELETE FROM sqlite_sequence where name = :name`, [
      this.getMetadata(entity).tableName
    ]);
  }

  async start(): Promise<void> {
    await this.roleSeeds();
    await this.userSeeds();
    await this.realmSeeds();
    await this.clusterSeeds();
    await this.unitSeeds();
    await this.namedTimeRangeSeeds();
    await this.equipmentSeeds();
  }

  @Transaction()
  private async roleSeeds(): Promise<void> {
    await this.emptyAndWipeIndices(Role);
    await this.manager.save(
      Role,
      ROLES.map((role, id) => ({ id: id + 1, name: role.name }))
    );
  }

  @Transaction()
  private async userSeeds(): Promise<void> {
    await this.emptyAndWipeIndices(User);
    let superuser = await this.manager.getRepository(Role).findOneOrFail({
      where: {
        name: "superuser"
      }
    });

    await this.manager
      .getRepository(User)
      .save([
        { name: "root", role: superuser, hash: await bcrypt.hash("toor", 10) }
      ]);
  }

  @Transaction()
  private async unitSeeds(): Promise<void> {
    await this.emptyAndWipeIndices(Unit);
    let watts = new Unit();

    watts.plural = "Watts";
    watts.symPlural = "W";
    watts.singular = "Watt";
    watts.symSingular = "W";

    let kiloWatts = new DerivedUnit();

    kiloWatts.mult = 1000;
    kiloWatts.singular = "KiloWatt";
    kiloWatts.plural = "KiloWatts";
    kiloWatts.symPlural = "kW";
    kiloWatts.symSingular = "kW";

    watts.derivedUnits = [kiloWatts];

    await this.manager.save(watts);
  }

  @Transaction()
  private async namedTimeRangeSeeds() {
    await this.emptyAndWipeIndices(NamedTimeRange);

    let day = new NamedTimeRange();
    day.name = "Day";

    let week = new NamedTimeRange();
    week.name = "Week";

    let month = new NamedTimeRange();
    month.name = "Month";
    await this.manager.save([day, week, month]);
  }

  @Transaction()
  private async equipmentSeeds(): Promise<void> {
    await this.emptyAndWipeIndices(Equipment);
    await this.emptyAndWipeIndices(MeasurementDefinition);
    for (let i = 0; i < 100; i++) {
      let realm = await this.manager
        .createQueryBuilder(Realm, "realm")
        .orderBy("RANDOM()")
        .limit(1)
        .getOne();

      let equipment = new Equipment();
      equipment.name = Date.now().toString(16);
      equipment.comparator = "seeded-equipment/1/ORM-SEEDER/" + equipment.name;
      equipment.realm = realm!;
      this.manager.save(equipment);

      if (Math.random() > 0.5) {
        continue;
      }

      let measurementDefinition = new MeasurementDefinition();

      measurementDefinition.name = "Measurement/" + Date.now().toString(16);
      measurementDefinition.range = await this.manager.findOneOrFail(
        NamedTimeRange,
        {
          where: {
            name: ["Month", "Year", "Day"][Math.floor(Math.random() * 3)]
          }
        }
      );
      this.manager.save(measurementDefinition);
    }
  }

  @Transaction()
  private async clusterSeeds(): Promise<void> {
    await this.emptyAndWipeIndices(Cluster);

    for (let i = 0; i < 100; i++) {
      let cluster = new Cluster();
      cluster.name = "Demo Cluster - #" + i;
      await this.manager.save(cluster);

      for (let k = 0; k < Math.random() * 50; k++) {
        let realm = new Realm();
        realm.name = `Cluster ${i} - Realm ${k}`;
        realm.cluster = cluster;
        await this.manager.save(realm);
      }
    }
  }

  @Transaction()
  private async realmSeeds(): Promise<void> {
    await this.emptyAndWipeIndices(Realm);

    let realmsToAdd: Realm[] = [];

    for (let i = 0; i < Math.random() * 50; i++) {
      let realm = new Realm();
      realm.name = `Cluster ${i} - Realm ${i}`;
      realmsToAdd.push(realm);
    }

    await this.manager.save(realmsToAdd);
  }
}

MonolithicSeed.runInstance();
