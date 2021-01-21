import {
  Arg,
  Query,
  Resolver,
  Int,
  Mutation,
  Ctx,
  UseMiddleware,
  FieldResolver,
  Root,
} from "type-graphql";
import { UserComment } from "./../entities/UserComment";
import { MyContext } from "../types";
import { isAuth } from "./../middlewares/isAuth";
import { User } from "../entities/User";


@Resolver(UserComment)
export class UserCommentResolver {
  // @FieldResolver(() => Post, { nullable: true })
  // async post(@Root() userComment: UserComment): Promise<Post | null> {
  //   if (!userComment.postId) {
  //     return null;
  //   }
  //   const post = await Post.findOne(userComment.postId);
  //   if (post) {
  //     return post;
  //   }
  //   return null;
  // }

  // @FieldResolver(() => UserComment, { nullable: true })
  // async parentComment(
  //   @Root() userComment: UserComment
  // ): Promise<UserComment | null> {
  //   if (!userComment.parentCommentId) {
  //     return null;
  //   }
  //   const cmt = await UserComment.findOne(userComment.parentCommentId);
  //   if (cmt) {
  //     return cmt;
  //   }
  //   return null;
  // }

  @FieldResolver(() => User)
  async user(
    @Root() userComment: UserComment,
    @Ctx() { userLoader }: MyContext
  ): Promise<User | null> {
    return userLoader.load(userComment.userId);
  }

  @FieldResolver(() => [UserComment])
  async childComments(
    @Root() userComment: UserComment,
    @Ctx() { userCommentLoader }: MyContext
  ): Promise<UserComment[]> {
    // return UserComment.find({
    //   where: {
    //     parentCommentId: userComment.id,
    //   },
    // });

    return userCommentLoader.load(userComment.id);
  }

  @Query(() => [UserComment])
  async comments(
    @Arg("postId", () => Int) postId: number
  ): Promise<UserComment[]> {
    return UserComment.find({
      where: {
        postId,
      },
    });
  }

  @Query(() => UserComment, { nullable: true })
  async comment(
    @Arg("commentId", () => Int) commentId: number
  ): Promise<UserComment | null> {
    const comment = await UserComment.findOne({ where: { id: commentId } });
    if (comment) return comment;

    return null;
  }

  @Mutation(() => UserComment)
  @UseMiddleware(isAuth)
  async addComment(
    @Arg("postId", () => Int, { nullable: true }) postId: number | null,
    @Arg("parentId", () => Int, { nullable: true }) parentId: number | null,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<UserComment> {
    if (postId && parentId) {
      parentId = null;
    }

    if (!postId && !parentId) {
      throw new Error("invalid data");
    }

    return UserComment.create({
      postId: postId ? postId : undefined,
      parentCommentId: parentId ? parentId : undefined,
      text,
      userId: req.session.userId,
    }).save();
  }
}
