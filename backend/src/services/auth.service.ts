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
  role?: string;
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
  role: string;
  token: string;
}

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

  // Sanitize role
  const safeRole = data.role === 'STUDENT' ? 'STUDENT' : 'TEACHER';

  const user = await User.create({
    email: data.email,
    passwordHash: hashedPassword,
    schoolName: data.schoolName,
    location: data.location,
    role: safeRole,
  });

  logger.info({ userId: user._id, role: safeRole }, '[AUTH] User registered');
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

  logger.info({ userId: user._id }, '[AUTH] User logged in');
  return toAuthResponse(user);
};

export const getUserByIdService = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw new AppError('User not found', 404);
  return user;
};
