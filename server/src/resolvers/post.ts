import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { isAuth } from "./../middlewares/isAuth";
import { getConnection } from "typeorm";
import { Updoot } from "./../entities/Updoot";
import { User } from "../entities/User";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field(() => Boolean)
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post): String {
    return root.text.slice(0, 50);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() root: Post,
    @Ctx() { updootLoader, req }: MyContext
  ): Promise<number | null> {
    if (!req.session.userId) {
      return null;
    }

    const updoot = await updootLoader.load({
      postId: root.id,
      userId: req.session.userId,
    });

    return updoot ? updoot.value : null;
  }

  @FieldResolver(() => User)
  async creator(
    @Root() post: Post,
    @Ctx() { userLoader }: MyContext
  ): Promise<User | null> {
    return userLoader.load(post.creatorId);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("vote", () => Int) vote: number,
    @Arg("postId") postId: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const { userId } = req.session;

    const realVote = vote === -1 ? -1 : 1;

    const updoot = await Updoot.findOne({ postId, userId });

    if (!updoot) {
      await getConnection().transaction(async (tranEntityManager) => {
        await tranEntityManager.insert(Updoot, {
          userId,
          postId,
          value: realVote,
        });

        await tranEntityManager.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [realVote, postId]
        );
      });
    } else if (updoot && updoot.value !== realVote) {
      await getConnection().transaction(async (tranEntityManager) => {
        await tranEntityManager.update(
          Updoot,
          { userId, postId },
          {
            value: realVote,
          }
        );

        await tranEntityManager.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [2 * realVote, postId]
        );
      });
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string
  ): Promise<PaginatedPosts> {
    // await sleep(3000);
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
    select p.*
    from post p 
    ${cursor ? `where p."createdAt" < $2` : ``}
    ORDER BY p."createdAt" DESC 
    LIMIT $1;
  `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ["creator"] });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("postData") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({
        title,
        text,
      })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();
    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const post = await Post.findOne({ id });
    console.log(`found post ${post}`);
    if (!post) {
      return false;
    }

    if (post.creatorId !== req.session.userId) {
      throw new Error("not authorized");
    }

    await Updoot.delete({ postId: id });
    await Post.delete({ id });

    return true;
  }
}
