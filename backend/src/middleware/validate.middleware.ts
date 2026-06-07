import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { z } from 'zod';

type Target = 'body' | 'params' | 'query';

export function validate(schema: z.ZodType, target: Target = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.issues });
      return;
    }
    req[target] = result.data;
    next();
  };
}
