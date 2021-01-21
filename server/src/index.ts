import "reflect-metadata";
import { __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { MyContext } from "src/types";
import cors from "cors";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";
import { Updoot } from "./entities/Updoot";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { UserComment } from './entities/UserComment';
import { UserCommentResolver } from "./resolvers/usercomment";
import { createUserLoader } from "./utils/createUserLoader";
import { createUserCommentLoader } from "./utils/createUserCommentLoader";

const main = async () => {
  // await sendEmail("faizalshaikh9999@gmail.com", "hello", "hello");
  // const orm = await MikroORM.init(mikroORMConfig);

  // const migrator = orm.getMigrator();

  // await migrator.createMigration(); // creates file Migration20191019195930.ts
  // console.log(`created migrations`);
  // await migrator.up(); // runs migrations up to the latest

  const conn = await createConnection({
    type: "postgres",
    database: "lireddit",
    username: "postgres",
    password: "postgres",
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Updoot, UserComment],
  });
  await conn.runMigrations();

  // await Post.delete({});

  const RedisStore = connectRedis(session);
  const redis = new Redis();
  const app = express();
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(
    session({
      name: "quid",
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "lax", // csrf
        secure: __prod__, // cookie only works in https
      },
      saveUninitialized: false,
      secret: "bvsijddyosdcsndcuzlzksdqqoi",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver, UserCommentResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      redis,
      updootLoader: createUpdootLoader(),
      userLoader: createUserLoader(),
      userCommentLoader: createUserCommentLoader()
    }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log("express running on 4000");
  });
};

//   const post = orm.em.create(Post, {
//     title: "my first post",
//   });

//   await orm.em.persistAndFlush(post);

// const posts = await orm.em.find(Post,{});
// console.log(posts);

main().catch((err) => {
  console.error(err);
});
