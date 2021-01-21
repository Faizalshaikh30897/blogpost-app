import { ObjectType, Field, Int } from "type-graphql";
import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class UserComment extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  text!: string;

  @Field(() => Int)
  @Column()
  userId!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.comments)
  user: User;

  @Field(() => Int, { nullable: true })
  @Column({nullable:true})
  postId: number;

  @Field(() => Post, { nullable: true })
  @ManyToOne(() => Post, (post) => post.comments,{nullable: true})
  post: Post;

  @Field(() => Int, { nullable: true })
  @Column({nullable:true})
  parentCommentId: number;

  @Field(() => UserComment, { nullable: true })
  @ManyToOne(() => UserComment, (comment) => comment.childComments,{nullable: true})
  parentComment: UserComment;

  @OneToMany(() => UserComment, (comment) => comment.parentComment)
  childComments: UserComment[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  udpatedAt: Date;
}
