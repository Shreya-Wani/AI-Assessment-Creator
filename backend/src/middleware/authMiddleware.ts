import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { config } from '../config';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, config.jwtSecret) as any;

      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      
      req.user = user;
      next();
    } catch (error: any) {
      logger.warn({ error: error.message }, '[AUTH] Token verification failed');
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

export enum Role {
  TEACHER = 'TEACHER',
}

export const authorizeRoles = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: `User role ${req.user?.role} is not authorized` });
      return;
    }
    next();
  };
};
