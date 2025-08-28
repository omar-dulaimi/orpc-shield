export type User = {
  id: string;
  role: 'admin' | 'editor' | 'user' | 'guest';
};

export type Context = {
  user?: User | null;
};

export function createContext(): Context {
  return { user: null };
}

export function createContextFromRequest(req: { headers: Record<string, any> }): Context {
  const id = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined as User['role'] | undefined;
  if (id && role) {
    return { user: { id, role } };
  }
  return { user: null };
}
