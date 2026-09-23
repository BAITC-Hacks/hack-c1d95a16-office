import { BusFront, Trees, HeartHandshake, ShieldCheck, MessagesSquare } from 'lucide-react';
import type { CategoryId } from '../types';
export const categoryIcons = { transport: BusFront, green: Trees, social: HeartHandshake, safety: ShieldCheck, services: MessagesSquare } satisfies Record<CategoryId, typeof BusFront>;
