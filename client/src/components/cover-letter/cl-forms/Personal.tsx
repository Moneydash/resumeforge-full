import React from "react";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import type { UseFormRegister } from "react-hook-form";
import type { CLFormData } from "@/types/interface.cl-form-data";
import type { FieldErrors } from "react-hook-form";

interface PersonalFieldsProps {
  register: UseFormRegister<CLFormData>;
  errors: FieldErrors<CLFormData>;
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  cardClasses: string;
  labelClasses: string;
  inputClasses: string;
}

const PersonalFields: React.FC<PersonalFieldsProps> = ({
  register,
  errors,
  sectionDivClasses,
  sectionHeaderClasses,
  cardClasses,
  labelClasses,
  inputClasses
}) => {
  return (
    <div className={sectionDivClasses + 'pb-10'}>
      <h3 className={sectionHeaderClasses + 'ml-1'}>Personal Information</h3>
      <div className={cardClasses}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sender.name" className={labelClasses}>
              Full Name *
            </Label>
            <Input
              id="sender.name"
              {...register('sender.name')}
              className={inputClasses}
              placeholder="John Doe"
            />
            {errors.sender?.name && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sender.job_title" className={labelClasses}>
              Job Title *
            </Label>
            <Input
              id="sender.job_title"
              {...register('sender.job_title')}
              className={inputClasses}
              placeholder="Software Engineer"
            />
            {errors.sender?.job_title && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.job_title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sender.email" className={labelClasses}>
              Email *
            </Label>
            <Input
              id="sender.email"
              type="email"
              {...register('sender.email')}
              className={inputClasses}
              placeholder="john.doe@email.com"
            />
            {errors.sender?.email && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sender.phone" className={labelClasses}>
              Phone *
            </Label>
            <Input
              id="sender.phone"
              {...register('sender.phone')}
              className={inputClasses}
              placeholder="+1 (555) 123-4567"
            />
            {errors.sender?.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.phone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sender.location" className={labelClasses}>
              Location *
            </Label>
            <Input
              id="sender.location"
              {...register('sender.location')}
              className={inputClasses}
              placeholder="New York, NY"
            />
            {errors.sender?.location && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.location.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sender.linkedin" className={labelClasses}>
              LinkedIn (Optional)
            </Label>
            <Input
              id="sender.linkedin"
              {...register('sender.linkedin')}
              className={inputClasses}
              placeholder="linkedin.com/in/johndoe"
            />
            {errors.sender?.linkedin && (
              <p className="text-red-500 text-sm mt-1">{errors.sender.linkedin.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="sender.address" className={labelClasses}>
            Address *
          </Label>
          <Textarea
            id="sender.address"
            {...register('sender.address')}
            className={inputClasses}
            placeholder="123 Main Street, Apt 4B, New York, NY 10001"
            rows={2}
          />
          {errors.sender?.address && (
            <p className="text-red-500 text-sm mt-1">{errors.sender.address.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonalFields;