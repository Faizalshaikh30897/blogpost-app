import DataLoader from "dataloader";
import { UserComment } from "./../entities/UserComment";
import { getConnection } from "typeorm";

export const createUserCommentLoader = () =>
  new DataLoader<number, UserComment[]>(async (keys) => {
    const comments = await getConnection()
      .getRepository(UserComment)
      .createQueryBuilder("comment")
      .where('comment."parentCommentId" in (:...pcIds)', {
        pcIds:keys,
      })
      .getMany();
    const commentIdsToComments: Map<number, UserComment[]> = new Map<
      number,
      UserComment[]
    >();
    comments.forEach((userComment) => {
      const old = commentIdsToComments.get(userComment.parentCommentId);
      if (old) {
        const newC = [...old, userComment];
        commentIdsToComments.set(userComment.parentCommentId, newC);
      } else {
        commentIdsToComments.set(userComment.parentCommentId, [userComment]);
      }
    });
    return keys.map((key) => {
      const data = commentIdsToComments.get(key);
      if (data) return data;
      return [];
    });
  });
