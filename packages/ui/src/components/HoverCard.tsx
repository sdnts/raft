import * as Primitive from "@radix-ui/react-hover-card";
import clsx from "clsx";

const Root = (props: Primitive.HoverCardProps) => {
  return <Primitive.Root {...props} openDelay={300} closeDelay={100} />;
};

const Content = ({ children, ...props }: Primitive.HoverCardContentProps) => {
  return (
    <Primitive.Portal>
      <Primitive.Content
        {...props}
        className={clsx(
          "p-4 m-4 rounded-md",
          "bg-neutral-900",
          "border border-neutral-600",
          "text-sm text-white",
          props.className
        )}
      >
        {children}
        <Primitive.Arrow className={clsx("-my-4", "fill-neutral-600")} />
      </Primitive.Content>
    </Primitive.Portal>
  );
};

export const HoverCard = {
  Root,
  Trigger: Primitive.Trigger,
  Content,
};
