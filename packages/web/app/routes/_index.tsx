import { AccessibleIcon } from "@radix-ui/react-accessible-icon";
import { Question } from "phosphor-react";
import { NodeControls } from "~/components/NodeControls";
import { WorldMap } from "~/components/WorldMap";

export default function Index() {
  return (
    <>
      <header className="w-10/12 mt-8 flex items-center justify-between">
        <svg
          width={24}
          height={24}
          className="opacity-25"
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32.9038 95.0962C29.0115 91.2038 31.5923 83.0385 29.6038 78.2577C27.6154 73.4769 20 69.2885 20 64C20 58.7115 27.5308 54.6923 29.6038 49.7423C31.6769 44.7923 29.0115 36.7962 32.9038 32.9038C36.7962 29.0115 44.9615 31.5923 49.7423 29.6038C54.5231 27.6154 58.7115 20 64 20C69.2885 20 73.3077 27.5308 78.2577 29.6038C83.2077 31.6769 91.2038 29.0115 95.0962 32.9038C98.9885 36.7962 96.4077 44.9615 98.3962 49.7423C100.385 54.5231 108 58.7115 108 64C108 69.2885 100.469 73.3077 98.3962 78.2577C96.3231 83.2077 98.9885 91.2038 95.0962 95.0962C91.2038 98.9885 83.0385 96.4077 78.2577 98.3962C73.4769 100.385 69.2885 108 64 108C58.7115 108 54.6923 100.469 49.7423 98.3962C44.7923 96.3231 36.7962 98.9885 32.9038 95.0962Z"
            fill="#FFA800"
          />
        </svg>

        <AccessibleIcon label="Help">
          <Question
            width={24}
            height={24}
            className="text-white transition-opacity opacity-25 hover:opacity-100"
          />
        </AccessibleIcon>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <section className="relative">
          <WorldMap className="w-full h-auto opacity-10" />

          <NodeControls id="us1" position={{ top: 31, left: 8 }} />
          <NodeControls id="us2" position={{ top: 30, left: 22 }} />
          <NodeControls id="eu1" position={{ top: 20, left: 45 }} />
          <NodeControls id="eu2" position={{ top: 22, left: 48 }} />
          <NodeControls id="eu3" position={{ top: 29, left: 43 }} />
          <NodeControls id="ap1" position={{ top: 58, left: 80 }} />
          <NodeControls id="ap2" position={{ top: 32, left: 88.3 }} />
          <NodeControls id="ap3" position={{ top: 37, left: 70 }} />
          <NodeControls id="sa1" position={{ top: 76, left: 31 }} />
          <NodeControls id="af1" position={{ top: 83.3, left: 51 }} />
          <NodeControls id="oc1" position={{ top: 85, left: 92 }} />
        </section>
      </main>
    </>
  );
}
