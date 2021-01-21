import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserCommentLoader } from "./utils/createUserCommentLoader";
import { createUserLoader } from "./utils/createUserLoader";

export type MyContext = {
  req: Request & { session: any };
  res: Response;
  redis: Redis;
  updootLoader: ReturnType<typeof createUpdootLoader>;
  userLoader: ReturnType<typeof createUserLoader>;
  userCommentLoader: ReturnType<typeof createUserCommentLoader>
};
