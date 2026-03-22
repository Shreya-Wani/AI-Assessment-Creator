import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { config } from '../config';

// ── Types ─────────────────────────────────────────────────────────────
export interface RegisterData {
  email: string;
  password: string;
  schoolName: string;
  location: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  _id: string;
  email: string;
  schoolName: string;
  location: string;
  avatarUrl?: string;
  role: string;
  token: string;
}

export interface UpdateProfileData {
  schoolName?: string;
  location?: string;
  avatarUrl?: string;
}

const buildDefaultAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
};

const ensurePersistentAvatar = async (user: IUser): Promise<IUser> => {
  if (typeof user.avatarUrl === 'string' && user.avatarUrl.trim()) {
    return user;
  }

  user.avatarUrl = buildDefaultAvatarUrl(user.email || user._id.toString());
  await user.save();
  return user;
};

// ── Private Helpers ───────────────────────────────────────────────────

const generateToken = (id: string, role: string): string => {
  return jwt.sign(
    { id, role },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
};


const toAuthResponse = (user: IUser): AuthResponse => ({
  _id: user._id.toString(),
  email: user.email,
  schoolName: user.schoolName,
  location: user.location,
  avatarUrl: user.avatarUrl,
  role: user.role,
  token: generateToken(user._id.toString(), user.role),
});

// ── Service Functions ─────────────────────────────────────────────────

export const registerService = async (data: RegisterData): Promise<AuthResponse> => {
  // Input validation
  if (!data.email || !data.password) {
    throw new AppError('Email and password are required', 400);
  }
  if (!data.schoolName || !data.location) {
    throw new AppError('School name and location are required', 400);
  }
  if (data.password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  // Check duplicate
  const userExists = await User.findOne({ email: data.email });
  if (userExists) {
    throw new AppError('User already exists', 409);
  }

  // Hash password (bcrypt with salt rounds = 10)
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    email: data.email,
    passwordHash: hashedPassword,
    schoolName: data.schoolName,
    location: data.location,
    avatarUrl: buildDefaultAvatarUrl(data.email),
    role: 'TEACHER',
  });

  logger.info({ userId: user._id, role: 'TEACHER' }, '[AUTH] User registered');
  return toAuthResponse(user);
};

export const loginService = async (data: LoginData): Promise<AuthResponse> => {
  // Input validation
  if (!data.email || !data.password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: data.email });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const normalizedUser = await ensurePersistentAvatar(user);

  logger.info({ userId: normalizedUser._id }, '[AUTH] User logged in');
  return toAuthResponse(normalizedUser);
};

export const getUserByIdService = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const normalizedUser = await ensurePersistentAvatar(user);
  const sanitized = await User.findById(normalizedUser._id).select('-passwordHash');
  if (!sanitized) throw new AppError('User not found', 404);
  return sanitized;
};

export const updateUserProfileService = async (userId: string, data: UpdateProfileData): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (typeof data.schoolName === 'string' && data.schoolName.trim()) {
    user.schoolName = data.schoolName.trim();
  }

  if (typeof data.location === 'string' && data.location.trim()) {
    user.location = data.location.trim();
  }

  if (typeof data.avatarUrl === 'string' && data.avatarUrl.trim()) {
    user.avatarUrl = data.avatarUrl.trim();
  }

  await user.save();
  const sanitized = await User.findById(userId).select('-passwordHash');
  if (!sanitized) throw new AppError('User not found', 404);
  return sanitized;
};
