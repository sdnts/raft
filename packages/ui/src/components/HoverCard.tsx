import * as Primitive from "@radix-ui/react-hover-card";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, PropsWithChildren, useContext, useState } from "react";

const HoverCardContext = createContext({
  open: false,
  setOpen: (o: boolean) => {},
});

const Root = (props: Primitive.HoverCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>
      <Primitive.Root
        {...props}
        open={open}
        onOpenChange={setOpen}
        openDelay={400}
        closeDelay={100}
      />
    </HoverCardContext.Provider>
  );
};

type ContentProps = PropsWithChildren<{}>;
const Content = ({ children, ...props }: ContentProps) => {
  const { open, setOpen } = useContext(HoverCardContext);

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
              <Primitive.Arrow className="fill-borders" />
            </motion.div>
          </Primitive.Content>
        </Primitive.Portal>
      )}
    </AnimatePresence>
  );
};

export const HoverCard = {
  Root,
  Trigger: Primitive.Trigger,
  Content,
};
