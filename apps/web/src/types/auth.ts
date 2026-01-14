import type { ReactNode } from "react";
import type { User } from "firebase/auth";

export type TAuthContext = {
  user: User;
  sign_out: () => void;
};

export type TAuthGateProps = {
  children: ReactNode;
};
