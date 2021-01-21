import { Field, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { Post } from './Post';

@Entity()
@ObjectType()
export class Updoot extends BaseEntity{

  @Field()
  @PrimaryColumn()
  userId!: number;


  @Field()
  @PrimaryColumn()
  postId!: number;

  @Field(() => User)
  @ManyToOne(()=> User,(user)=> user.updoots) 
  user!: User;

  @Field(() => Post)
  @ManyToOne(()=> Post,(post)=> post.updoots) 
  post!: Post;

  @Field(() => Int)
  @Column({type: "bigint"})
  value!: number;

}