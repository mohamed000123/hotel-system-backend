import { RoomType } from '@prisma/client';

/** Human-readable labels returned by the API and accepted in create/update DTOs. */
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  [RoomType.STANDARD_SINGLE]: 'Standard Single',
  [RoomType.STANDARD_DOUBLE]: 'Standard Double',
  [RoomType.DELUXE_KING]: 'Deluxe King',
  [RoomType.JUNIOR_SUITE]: 'Junior Suite',
  [RoomType.FAMILY_ROOM]: 'Family Room',
};

export const ROOM_TYPE_OPTIONS = Object.values(ROOM_TYPE_LABELS);

const LABEL_TO_ENUM = new Map(
  Object.entries(ROOM_TYPE_LABELS).map(([enumKey, label]) => [
    label,
    enumKey as RoomType,
  ]),
);

export function roomTypeLabelToEnum(label: string): RoomType {
  const value = LABEL_TO_ENUM.get(label);
  if (!value) {
    throw new Error(`Unknown room type label: ${label}`);
  }
  return value;
}

export function roomTypeEnumToLabel(type: RoomType): string {
  return ROOM_TYPE_LABELS[type];
}
