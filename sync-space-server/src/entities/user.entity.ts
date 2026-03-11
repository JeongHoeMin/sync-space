import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Channel } from './channel.entity';
import { ChannelParticipant } from './channel-participant.entity';
import { Message } from './message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Channel, (channel) => channel.host)
  hosted_channels: Channel[];

  @OneToMany(() => ChannelParticipant, (participant) => participant.user)
  participations: ChannelParticipant[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];
}
