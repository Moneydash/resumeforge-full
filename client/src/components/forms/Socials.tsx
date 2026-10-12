import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { CirclePlusIcon, Eye, EyeOff, Trash2Icon } from "lucide-react";
import React from "react";
import {
  Controller,
  useWatch,
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
import { SectionBody, SectionHeader, type SectionControls } from "./SectionHeader";

interface socialFieldComponentInterface {
  controls: SectionControls;
  appendSocial: UseFieldArrayAppend<ResumeFormData>;
  addButtonClasses: string;
  socialFields: FieldArrayWithId<ResumeFormData>[];
  setValue: UseFormSetValue<ResumeFormData>;
  control: Control<ResumeFormData>;
  register: UseFormRegister<ResumeFormData>;
  removeSocial: (index: number) => void;
}

const SocialsFieldsComponent: React.FC<socialFieldComponentInterface> = ({
  controls,
  appendSocial,
  addButtonClasses,
  socialFields,
  control,
  setValue,
  register,
  removeSocial
}) => {

  const socials = useWatch({ control, name: 'socials' });

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
      <SectionHeader
        title="Socials"
        controls={controls}
        actions={
          <button
            type="button"
            onClick={() => appendSocial({ name: '', link: '', slug: '', hidden: false })}
            className={addButtonClasses}
          >
            <CirclePlusIcon size={15} style={{ marginRight: 5, marginBottom: 0.3 }} /> Add Links
          </button>
        }
      />
      <SectionBody collapsed={controls.collapsed} hidden={controls.hidden} className="space-y-4">
        {socialFields.map((field, index) => (
          <div key={field.id} className={`flex items-center gap-2 relative ${socials?.[index]?.hidden ? 'opacity-50' : ''}`}>
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
            {/* Show / hide this link on the resume */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={socials?.[index]?.hidden ? 'Show link on resume' : 'Hide link from resume'}
                  onClick={() => setValue(`socials.${index}.hidden`, !socials?.[index]?.hidden)}
                >
                  {socials?.[index]?.hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{socials?.[index]?.hidden ? 'Show on resume' : 'Hide from resume'}</p>
              </TooltipContent>
            </Tooltip>
            {/* Remove button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={() => removeSocial(index)}><Trash2Icon size={20} /></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove Link</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </SectionBody>
    </div>
  );
};

export default SocialsFieldsComponent;