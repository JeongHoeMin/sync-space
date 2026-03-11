import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ChannelParticipant } from './channel-participant.entity';
import { Message } from './message.entity';

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.hosted_channels)
  @JoinColumn({ name: 'host_id' })
  host: User;

  @OneToMany(() => ChannelParticipant, (participant) => participant.channel)
  participants: ChannelParticipant[];

  @OneToMany(() => Message, (message) => message.channel)
  messages: Message[];
}
