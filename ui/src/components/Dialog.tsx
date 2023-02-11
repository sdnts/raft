import * as Primitive from "@radix-ui/react-dialog";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "phosphor-react";
import { createContext, PropsWithChildren, useContext, useState } from "react";
import { Icon } from "./Icon";

const DialogContext = createContext({
  open: false,
  setOpen: (o: boolean) => {},
});

const Root = (props: Primitive.DialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      <Primitive.Root {...props} open={open} onOpenChange={setOpen} />
    </DialogContext.Provider>
  );
};

type ContentProps = PropsWithChildren<{ title: string }>;
const Content = ({ title, children }: ContentProps) => {
  const { open, setOpen } = useContext(DialogContext);

  return (
    <AnimatePresence>
      {open && (
        <Primitive.Portal
          forceMount
          className={clsx(
            "fixed top-0 left-0",
            "flex items-center justify-center"
          )}
        >
          <Primitive.Overlay
            className={clsx(
              "absolute top-0 left-0 w-screen h-screen",
              "bg-black"
            )}
            asChild
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
              }}
            />
          </Primitive.Overlay>

          <Primitive.Content
            aria-describedby={undefined}
            className={clsx(
              "absolute top-48 left-0 w-screen h-screen",
              "flex items-start justify-center"
            )}
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -20 }}
              transition={{
                duration: 0.2,
              }}
              className={clsx(
                "w-1/2 max-w-2xl",
                "px-10 py-8",
                "bg-ui border border-borders",
                "text-white font-mono",
                "rounded-md"
              )}
            >
              <div className="flex items-center justify-between">
                <Primitive.Title className="uppercase text-2xl font-bold opacity-50">
                  {title}
                </Primitive.Title>
                <Primitive.Close>
                  <Icon label="Close">
                    <X
                      width={24}
                      height={24}
                      className="text-white transition-opacity opacity-25 hover:opacity-100"
                    />
                  </Icon>
                </Primitive.Close>
              </div>

              <div
                className="text-sm mt-12 leading-6"
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </div>
            </motion.aside>
          </Primitive.Content>
        </Primitive.Portal>
      )}
    </AnimatePresence>
  );
};

export const Dialog = {
  Root,
  Trigger: Primitive.Trigger,
  Content,
};
