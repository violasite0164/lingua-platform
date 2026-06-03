export type ProfileInboxKind = 'stamina_pack' | 'system';

export type ProfileInboxStaminaPayload = {
  purchase_id?: string;
  shop_item_id?: string;
  shop_item_title?: string;
  stamina_amount?: number;
};

export type ProfileInboxMessage = {
  id: string;
  kind: ProfileInboxKind;
  title: string;
  body: string;
  payload: ProfileInboxStaminaPayload;
  read_at: string | null;
  claimed_at: string | null;
  created_at: string;
};

export function isProfileInboxUnread(message: Pick<ProfileInboxMessage, 'read_at'>): boolean {
  return message.read_at == null;
}

export function canClaimStaminaPack(message: ProfileInboxMessage): boolean {
  if (message.kind !== 'stamina_pack' || message.claimed_at) return false;
  const amount = message.payload.stamina_amount;
  return typeof amount === 'number' && amount > 0;
}
