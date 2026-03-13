import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('drawings')
export class Drawing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  channel_id: string;

  @Column('jsonb', { default: [] })
  history: any[]; // DrawData 배열
}
