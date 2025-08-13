import React from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { ResumeFormData } from "@/types/interface.resume-form-data";

interface PersonalFieldInterface {
  sectionHeaderClasses: string;
  sectionDivClasses: string;
  labelClasses: string;
  register: UseFormRegister<ResumeFormData>,
  errors: FieldErrors<ResumeFormData>;
  inputClasses: string;
}

const PersonalFieldsComponent: React.FC<PersonalFieldInterface> = ({
  sectionHeaderClasses,
  sectionDivClasses,
  labelClasses,
  register,
  errors,
  inputClasses
}) => {
  return (
    <div className="space-y-4">
      <h2 className={`${sectionHeaderClasses} ${sectionDivClasses}`}>Personal Details</h2>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name" className={labelClasses}>Full Name *</Label>
          <Input
            type="text"
            id="name"
            {...register('personal.name')}
            className={inputClasses}
            placeholder="Enter your full name"
          />
          {errors.personal?.name && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.personal.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="headline" className={labelClasses}>Professional Headline</Label>
          <Input
            type="text"
            id="headline"
            {...register('personal.headline')}
            className={inputClasses}
            placeholder="e.g., Senior Software Engineer"
          />
        </div>

        <div>
          <Label htmlFor="email" className={labelClasses}>Email *</Label>
          <Input
            type="email"
            id="email"
            {...register('personal.email')}
            className={inputClasses}
            placeholder="your.email@example.com"
          />
          {errors.personal?.email && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.personal.email.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="location" className={labelClasses}>Location</Label>
          <Input
            type="text"
            id="location"
            {...register('personal.location')}
            className={inputClasses}
            placeholder="City, Country"
          />
        </div>

        <div>
          <Label htmlFor="contact_number" className={labelClasses}>Phone Number</Label>
          <Input
            type="text"
            id="contact_number"
            {...register('personal.contact_number')}
            className={inputClasses}
            placeholder="Phone Number"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="websiteName" className={labelClasses}>Website Name</Label>
            <Input
              type="text"
              id="websiteName"
              {...register('personal.website.name')}
              className={inputClasses}
              placeholder="Portfolio"
            />
          </div>
          <div>
            <Label htmlFor="websiteLink" className={labelClasses}>Website URL</Label>
            <Input
              type="url"
              id="websiteLink"
              {...register('personal.website.link')}
              className={inputClasses}
              placeholder="https://yourwebsite.com"
            />
            {errors.personal?.website?.link && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {errors.personal.website.link.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PersonalFieldsComponent);