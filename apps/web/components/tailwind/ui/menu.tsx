"use client";

import { Check, Menu as MenuIcon, Monitor, Moon, SunDim, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { Separator } from "./separator";

const appearances = [
  // {
  //   theme: "System",
  //   icon: <Monitor className="h-4 w-4" />,
  // },
  {
    theme: "Light",
    icon: <SunDim className="h-4 w-4" />,
  },
  {
    theme: "Dark",
    icon: <Moon className="h-4 w-4" />,
  },
];

export default function Menu() {
  const { theme: currentTheme, setTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {session?.user?.image ? (
 <div className="flex">
   <button className="rounded-full">
     <Image
       src={session.user.image}
       alt={session.user.name || "User avatar"}
       width={30}
       height={30}
       className="rounded-full ring-2 ring-primary"
     />
   </button>
 </div>
) : (
 <Button variant="ghost" size="icon">
   <MenuIcon className="h-4 w-4" />
 </Button>
)}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        {session?.user && (
          <>
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{session.user.name}</div>
              <div className="text-xs text-muted-foreground">{session.user.email}</div>
            </div>
            <Separator className="my-2" />
          </>
        )}
        
        <p className="p-2 text-xs font-medium text-muted-foreground">モード</p>
        {appearances.map(({ theme, icon }) => (
          <Button
            variant="ghost"
            key={theme}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm"
            onClick={() => {
              setTheme(theme.toLowerCase());
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="rounded-sm border p-1">{icon}</div>
              <span>{theme}</span>
            </div>
            {currentTheme === theme.toLowerCase() && <Check className="h-4 w-4" />}
          </Button>
        ))}

        <Separator className="my-2" />
        
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-red-600 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <div className="flex items-center space-x-2">
            <div className="rounded-sm p-1">
              <LogOut className="h-4 w-4" />
            </div>
            <span>ログアウト</span>
          </div>
        </Button>
      </PopoverContent>
    </Popover>
  );
}