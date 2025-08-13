import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import type { CLFormData } from '@/types/interface.cl-form-data';
import clSchema from '@/schema/cl-schema';
import { Button } from './ui/button';
import {
  inputClasses,
  labelClasses,
  sectionDivClasses,
  sectionHeaderClasses,
  cardClasses
} from '@/styles/form-classes';
import { SaveIcon } from 'lucide-react';
import PersonalFields from './cover-letter/cl-forms/Personal';
import RecipientFields from './cover-letter/cl-forms/Recipient';
import ContentFields from './cover-letter/cl-forms/Content';

interface CLFormProps {
  onSubmit: (data: CLFormData) => void;
  loading?: boolean;
  onChange?: (data: CLFormData) => void;
  sectionRefs?: {
    senderRef: React.RefObject<HTMLDivElement>;
    recipientRef: React.RefObject<HTMLDivElement>;
    contentRef: React.RefObject<HTMLDivElement>;
  }
}

const STORAGE_KEY = 'clFormData';

const CLForm: React.FC<CLFormProps> = ({ onSubmit, loading = false, onChange, sectionRefs }) => {
  const [loadingStep, setLoadingStep] = useState(0);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<CLFormData>({
    resolver: yupResolver(clSchema as any),
    defaultValues: {
      sender: {
        name: '',
        email: '',
        phone: '',
        address: '',
        website: { name: '', link: '' },
        location: '',
        linkedin: '',
        job_title: ''
      },
      recipient: {
        name: '',
        title: '',
        company: '',
        address: ''
      },
      content: {
        introduction: '',
        body: '',
        closing: ''
      }
    }
  });

  // Load saved form data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        reset(parsedData);
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, [reset]);

  // Handle form submission
  const handleSubmitForm = (data: CLFormData) => {
    // Clear saved data on successful submission
    localStorage.removeItem(STORAGE_KEY);
    onSubmit(data);
  };

  // Loading step progression
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 5);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-8">
      {/* Sender Information */}
      <div ref={sectionRefs?.senderRef}>
        <PersonalFields
          register={register}
          errors={errors}
          sectionDivClasses={sectionDivClasses}
          sectionHeaderClasses={sectionHeaderClasses}
          cardClasses={cardClasses}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
        />
      </div>

      {/* Recipient Information */}
      <div ref={sectionRefs?.recipientRef}>
        <RecipientFields
          register={register}
          errors={errors}
          sectionDivClasses={sectionDivClasses}
          sectionHeaderClasses={sectionHeaderClasses}
          cardClasses={cardClasses}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
        />
      </div>

      {/* Cover Letter Content */}
      <div ref={sectionRefs?.contentRef}>
        <ContentFields
          register={register}
          errors={errors}
          sectionHeaderClasses={sectionHeaderClasses}
          cardClasses={cardClasses}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
        />
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <Button
          type="submit"
          disabled={loading}
          className={`
            w-full flex justify-center items-center gap-2 py-3 px-4 
            border border-transparent rounded-lg shadow-sm 
            text-sm font-medium text-white 
            bg-indigo-600 hover:bg-indigo-700 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            dark:focus:ring-offset-gray-800
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {loadingStep === 0 && "Saving your information..."}
              {loadingStep === 1 && "Loading fonts for a polished look..."}
              {loadingStep === 2 && "Applying elegant styles..."}
              {loadingStep === 3 && "Creating your cover letter..."}
              {loadingStep === 4 && "Wrapping things up..."}
            </>
          ) : (
            <><SaveIcon /> Save & Generate Cover Letter</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CLForm;