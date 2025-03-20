"use client";
import { ModelSettingsTrigger } from "./model-setting";
import { DropdownMenuItem } from "../ui/dropdown-menu";

export const ClientSettingsMenuItem = () => {
  return (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <ModelSettingsTrigger />
    </DropdownMenuItem>
  );
};