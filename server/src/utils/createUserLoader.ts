import DataLoader from "dataloader";
import { User } from "./../entities/User";

export const createUserLoader = () =>
  new DataLoader<number, User | null>(async (keys) => {
    const users = await User.findByIds(keys as number[]);

    const usersIdsToUsers: Record<number, User> = {};

    users.forEach((user) => {
      usersIdsToUsers[user.id] = user;
    });

    return keys.map((key) => usersIdsToUsers[key]);
  });
