import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";

import {
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";

export default function ModeSelect() {
  return (
    <Select>
      <SelectTrigger className="w-[8rem]">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <SunIcon className="h-4 w-4" />
          Light
        </SelectItem>
        <SelectItem value="dark">
          <MoonIcon className="h-4 w-4" />
          Dark
        </SelectItem>
        <SelectItem value="system">
          <ComputerDesktopIcon className="h-4 w-4" />
          System
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
