import { createConnection } from "typeorm";
import { Role } from "@entities/Role";
import { User } from "@entities/User";
import bcrypt from "bcrypt";

export const run = async () => {
  const connection = await createConnection();
  const manager = connection.manager;

  let roleMeta = connection.getMetadata(Role);

  await manager.query(`DELETE FROM sqlite_sequence where name = :name`, [
    roleMeta.tableName
  ]);

  await manager
    .createQueryBuilder()
    .delete()
    .from(Role)
    .execute();

  let superuser = new Role();
  superuser.id = 1;
  superuser.name = "superuser";
  await manager.save(superuser);

  await manager
    .createQueryBuilder()
    .delete()
    .from(User)
    .execute();

  let userMeta = connection.getMetadata(User);

  await manager.query(`DELETE FROM sqlite_sequence where name = :name`, [
    userMeta.tableName
  ]);

  let root = new User();
  root.id = 1;
  root.name = "root";
  root.hash = await bcrypt.hash("toor", 10);

  root.role = superuser;

  await manager.save(root);
  return;
};

console.log("pushing static seeds");

run().catch(err => console.error(err));

export const up = () => {};
