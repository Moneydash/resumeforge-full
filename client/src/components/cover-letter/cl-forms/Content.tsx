import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UseFormRegister } from "react-hook-form";
import type { CLFormData } from "@/types/interface.cl-form-data";
import type { FieldErrors } from "react-hook-form";

interface ContentFieldsProps {
  register: UseFormRegister<CLFormData>;
  errors: FieldErrors<CLFormData>;
  sectionHeaderClasses: string;
  cardClasses: string;
  labelClasses: string;
  inputClasses: string;
}

const ContentFields: React.FC<ContentFieldsProps> = ({
  register,
  errors,
  sectionHeaderClasses,
  cardClasses,
  labelClasses,
  inputClasses
}) => {
  return (
    <div>
      <h3 className={sectionHeaderClasses + "ml-1"}>Cover Letter Content</h3>
      <div className={cardClasses}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="content.introduction" className={labelClasses}>
              Introduction *
            </Label>
            <Textarea
              id="content.introduction"
              {...register('content.introduction')}
              className={inputClasses}
              placeholder="Dear Hiring Manager, I am writing to express my strong interest in the [Position Title] role at [Company Name]..."
              rows={3}
            />
            {errors.content?.introduction && (
              <p className="text-red-500 text-sm mt-1">{errors.content.introduction.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="content.body" className={labelClasses}>
              Body *
            </Label>
            <Textarea
              id="content.body"
              {...register('content.body')}
              className={inputClasses}
              placeholder="In my previous role as [Previous Position], I successfully [key achievement]. My experience in [relevant skills/technologies] makes me an ideal candidate for this position..."
              rows={8}
            />
            {errors.content?.body && (
              <p className="text-red-500 text-sm mt-1">{errors.content.body.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="content.closing" className={labelClasses}>
              Closing (Optional)
            </Label>
            <Textarea
              id="content.closing"
              {...register('content.closing')}
              className={inputClasses}
              placeholder="Thank you for considering my application. I look forward to hearing from you soon. Sincerely, [Your Name]"
              rows={3}
            />
            {errors.content?.closing && (
              <p className="text-red-500 text-sm mt-1">{errors.content.closing.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContentFields;