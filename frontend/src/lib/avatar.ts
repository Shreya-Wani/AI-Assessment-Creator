type AvatarUser = {
  _id?: string;
  email?: string;
  avatarUrl?: string;
};

const buildFallbackAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

export const getUserAvatar = (user?: AvatarUser | null): string => {
  if (typeof user?.avatarUrl === 'string' && user.avatarUrl.trim()) {
    return user.avatarUrl;
  }

  const seed = user?._id || user?.email || 'teacher-default';
  return buildFallbackAvatar(seed);
};
