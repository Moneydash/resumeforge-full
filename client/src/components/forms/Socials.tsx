import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { CirclePlusIcon, Trash2Icon } from "lucide-react";
import React from "react";
import {
  Controller,
  type Control,
  type FieldArrayWithId,
  type UseFieldArrayAppend,
  type UseFormRegister,
  type UseFormSetValue
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";

interface socialFieldComponentInterface {
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  appendSocial: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  socialFields: FieldArrayWithId<ResumeFormData>[];
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  removeSocial: (index: number) => void;
}

const SocialsFieldsComponent: React.FC<socialFieldComponentInterface> = ({
  sectionDivClasses,
  sectionHeaderClasses,
  appendSocial,
  addButtonClasses,
  socialFields,
  control,
  setValue,
  register,
  removeSocial
}) => {

  const soc = [
    { name: 'LinkedIn', slug: 'linkedin' },
    { name: 'Github', slug: 'github' },
    { name: 'X / Twitter', slug: 'x-twitter' },
    { name: 'StackOverflow', slug: 'stack-overflow' },
    { name: 'Instagram', slug: 'instagram' },
    { name: 'Reddit', slug: 'reddit' },
    { name: 'Tiktok', slug: 'tiktok' },
    { name: 'Facebook', slug: 'facebook' },
    { name: 'Threads', slug: 'threads' },
    { name: 'Behance', slug: 'behance' },
    { name: 'Youtube', slug: 'youtube' },
    { name: 'Medium', slug: 'medium' }
  ];

  return (
    <div className="space-y-4">
      <div className={`${sectionDivClasses} flex justify-between items-center`}>
        <h2 className={sectionHeaderClasses}>Socials</h2>
        <button
          type="button"
          onClick={() => appendSocial({ name: '', link: '', slug: '' })}
          className={addButtonClasses}
        >
          <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Links
        </button>
      </div>
      {socialFields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2 relative">
          <div className="w-45 flex-shrink-0">
            {/* Dropdown to select social platform */}
            <Controller
              control={control}
              name={`socials.${index}.slug`}
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={val => {
                    field.onChange(val);
                    // Optionally, set the name as well if you want to keep both in sync:
                    const selected = soc.find(s => s.slug === val);
                    setValue(`socials.${index}.name`, selected ? selected.name : "");
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Socials</SelectLabel>
                      {soc.map((s, i) => (
                        <SelectItem key={i} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {/* Input for the link */}
          <Input
            type="url"
            {...register(`socials.${index}.link`)}
            className="py-4"
            placeholder="Link"
          />
          {/* Remove button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructive" size="icon" onClick={() => removeSocial(index)}><Trash2Icon size={20} /></Button>
            </TooltipTrigger>
            <TooltipContent className="bg-blue-500 dark:bg-blue-600 dark:text-white">
              <p>Remove Link</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
};

export default SocialsFieldsComponent;