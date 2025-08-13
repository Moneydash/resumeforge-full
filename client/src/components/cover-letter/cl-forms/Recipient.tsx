import React from "react";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import type { UseFormRegister } from "react-hook-form";
import type { CLFormData } from "@/types/interface.cl-form-data";
import type { FieldErrors } from "react-hook-form";

interface RecipientFieldsProps {
  register: UseFormRegister<CLFormData>;
  errors: FieldErrors<CLFormData>;
  sectionDivClasses: string;
  sectionHeaderClasses: string;
  cardClasses: string;
  labelClasses: string;
  inputClasses: string;
}

const RecipientFields: React.FC<RecipientFieldsProps> = ({
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
      <h3 className={sectionHeaderClasses + 'ml-1'}>Recipient Information</h3>
      <div className={cardClasses}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recipient.name" className={labelClasses}>
              Recipient Name *
            </Label>
            <Input
              id="recipient.name"
              {...register('recipient.name')}
              className={inputClasses}
              placeholder="Jane Smith"
            />
            {errors.recipient?.name && (
              <p className="text-red-500 text-sm mt-1">{errors.recipient.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="recipient.title" className={labelClasses}>
              Recipient Title *
            </Label>
            <Input
              id="recipient.title"
              {...register('recipient.title')}
              className={inputClasses}
              placeholder="Hiring Manager"
            />
            {errors.recipient?.title && (
              <p className="text-red-500 text-sm mt-1">{errors.recipient.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="recipient.company" className={labelClasses}>
              Company *
            </Label>
            <Input
              id="recipient.company"
              {...register('recipient.company')}
              className={inputClasses}
              placeholder="Tech Company Inc."
            />
            {errors.recipient?.company && (
              <p className="text-red-500 text-sm mt-1">{errors.recipient.company.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="recipient.address" className={labelClasses}>
            Company Address *
          </Label>
          <Textarea
            id="recipient.address"
            {...register('recipient.address')}
            className={inputClasses}
            placeholder="456 Business Ave, Suite 100, San Francisco, CA 94105"
            rows={2}
          />
          {errors.recipient?.address && (
            <p className="text-red-500 text-sm mt-1">{errors.recipient.address.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecipientFields;