
export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: "TENANT" | "LANDLORD" | "ADMIN";
        status: "ACTIVE" | "BANNED";
      };
    }
  }
}
