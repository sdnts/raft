import * as AccessibleIcon from "@radix-ui/react-accessible-icon";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ label: string }>;

export const Icon = ({ label, children }: Props) => {
  return <AccessibleIcon.Root label={label}>{children}</AccessibleIcon.Root>;
};
