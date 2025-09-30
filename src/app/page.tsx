import Link from "next/link";
import { Button } from "@/components/ui/button";
import AuthButton from "../components/authButton";

export default function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div>hello world</div>
      {/* <AuthButton /> */}
      <div className="mt-4 flex flex-col gap-2">
        {/* load */}
        <Button>
          <Link href="/load">load</Link>
        </Button>

        {/* chat */}
        <Button>
          <Link href="/chat">chat</Link>
        </Button>

        {/* home */}
        <Button>
          <Link href="/home">home</Link>
        </Button>
      </div>
    </div>
  );
}
