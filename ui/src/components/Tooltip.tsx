import * as Primitive from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, PropsWithChildren, useContext, useState } from "react";

const TooltipContext = createContext({
  open: false,
});

const Root = (props: Primitive.TooltipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ open }}>
      <Primitive.Root {...props} open={open} onOpenChange={setOpen} />
    </TooltipContext.Provider>
  );
};

type ContentProps = PropsWithChildren<{}>;
const Content = ({ children, ...props }: ContentProps) => {
  const { open } = useContext(TooltipContext);

  return (
    <AnimatePresence>
      {open && (
        <Primitive.Portal forceMount>
          <Primitive.Content
            side="top"
            className={clsx(
              "p-4 m-4 rounded-md",
              "bg-neutral-900",
              "border border-borders",
              "text-sm text-white",
              "max-w-md"
            )}
            asChild
          >
            <motion.div
              initial={{ opacity: 0, translateY: "-0.25rem" }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: "-0.25rem" }}
              transition={{ duration: 0.1 }}
            >
              {children}
              {/* <Arrow className="fill-borders" /> */}
            </motion.div>
          </Primitive.Content>
        </Primitive.Portal>
      )}
    </AnimatePresence>
  );
};

export const Tooltip = {
  Provider: Primitive.Provider,
  Root,
  Trigger: Primitive.Trigger,
  Content,
};
