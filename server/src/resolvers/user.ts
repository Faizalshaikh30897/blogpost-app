import { MyContext } from "../types";
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { User } from "./../entities/User";
import argon2 from "argon2";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { UserResponse } from "./UserResponse";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { FORGET_PASSWORD_PREFIX } from "../constants";
import { getConnection } from "typeorm";

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext): String {
    if (req.session.userId === user.id) {
      return user.email;
    }
    return "";
  }
  
  @Mutation(() => UserResponse)
  async register(
    @Arg("userData") userData: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(userData);

    if (errors) {
      return errors;
    }

    const hashedPassword = await argon2.hash(userData.password);
    let user = null;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: userData.username,
          password: hashedPassword,
          email: userData.email,
        })
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (err) {
      // console.log(err);
      if ((err = "23505" || err.detail.includes("already exists"))) {
        return {
          errors: [
            {
              field: "username",
              messsage:
                "username already taken, please provide a different username",
            },
          ],
        };
      } else {
        return {
          errors: [
            {
              field: "db",
              messsage: err.message,
            },
          ],
        };
      }
    }
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      /^.*\@.*\..*$/.test(usernameOrEmail)
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            messsage: "User does not exists",
          },
        ],
      };
    }

    const verifiedPassword = await argon2.verify(user.password, password);

    if (!verifiedPassword) {
      return {
        errors: [
          {
            field: "password",
            messsage: "Invalid password",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return true;
    }

    const token = v4();

    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 2 * 3
    );

    await sendEmail(
      user.email,
      `<a href='http://localhost:3000/change-password/${token}'>Change password</a>`,
      "Change your password"
    );
    return true;
  }

  @Mutation(() => UserResponse)
  async resetPassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 5) {
      return {
        errors: [
          {
            field: "newPassword",
            messsage: "Length must be greater than 5",
          },
        ],
      };
    }
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            messsage: "Rest Token Expired",
          },
        ],
      };
    }
    const userIdNum = parseInt(userId);
    const user = await User.findOne(parseInt(userId));
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            messsage: "User no longer exists",
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(newPassword);
    user.password = hashedPassword;
    await User.update(userIdNum, {
      password: hashedPassword,
    });

    req.session.userId = user.id;
    await redis.del(key);
    return { user };
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolve) => {
      req.session.destroy((err: any) => {
        if (err) {
          console.log(`session destroy error ${err}`);
          resolve(false);
        }
        res.clearCookie("quid");
        resolve(true);
      });
    });
  }

  @Query(() => [User])
  async users(): Promise<User[]> {
    return User.find();
  }
}
